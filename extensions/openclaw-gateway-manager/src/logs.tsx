import { useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  openExtensionPreferences,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getSettings } from "./utils";
import type { OpenClawSettings } from "./settings";
import {
  readLogContent,
  parseLogEntries,
  logEntryMarkdown,
  resolveLogPath,
  logErrorMessage,
} from "./log-data";
import type { LogLevel } from "./log-data";

const styles: Record<LogLevel, { icon: Icon; color: Color; label: string }> = {
  error: { icon: Icon.XMarkCircle, color: Color.Red, label: "ERROR" },
  warn: { icon: Icon.Warning, color: Color.Orange, label: "WARN" },
  info: { icon: Icon.Info, color: Color.Blue, label: "INFO" },
  debug: { icon: Icon.Code, color: Color.SecondaryText, label: "DEBUG" },
  unknown: { icon: Icon.Text, color: Color.SecondaryText, label: "OTHER" },
};

export default function LogsCommand() {
  const settings = getSettings();
  const settingsKey = JSON.stringify(settings);
  const [level, setLevel] = useState(settings.defaultLogLevel);
  const { data, error, isLoading, revalidate } = usePromise(
    async (serialized: string) => {
      const config = JSON.parse(serialized) as OpenClawSettings;
      const dailyDirectories =
        config.isolatedLogs && config.dailyLogDirectory === "/tmp/openclaw"
          ? []
          : [
              ...new Set([
                config.dailyLogDirectory,
                ...(!config.isolatedLogs ? [join(tmpdir(), "openclaw")] : []),
              ]),
            ];
      const path = await resolveLogPath(config.logPath, {
        stateDirectory: config.stateDirectory,
        dailyDirectories,
        includeServiceLog: !config.isolatedLogs,
      });
      try {
        return {
          path,
          entries: parseLogEntries(
            await readLogContent(path, config.logReadBytes),
            config.logEntryLimit,
            config.groupRepeatedLogs,
          ),
        };
      } catch (error) {
        throw new Error(logErrorMessage(error));
      }
    },
    [settingsKey],
  );
  const entries = (data?.entries ?? []).filter(
    (entry) =>
      level === "all" ||
      (level === "problems"
        ? ["error", "warn"].includes(entry.level)
        : entry.level === level),
  );
  const commonActions = (
    <>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action
        title="Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </>
  );
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={entries.length > 0 && !error}
      navigationTitle="OpenClaw Logs"
      searchBarPlaceholder="Search messages, sources or paths…"
      actions={<ActionPanel>{commonActions}</ActionPanel>}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by level"
          value={level}
          onChange={setLevel}
        >
          <List.Dropdown.Item title="All Levels" value="all" />
          <List.Dropdown.Item title="Warnings & Errors" value="problems" />
          <List.Dropdown.Item title="Errors" value="error" />
          <List.Dropdown.Item title="Warnings" value="warn" />
          <List.Dropdown.Item title="Info" value="info" />
          <List.Dropdown.Item title="Debug" value="debug" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load logs"
          description={error.message}
        />
      ) : entries.length === 0 ? (
        <List.EmptyView
          icon={Icon.Text}
          title={isLoading ? "Loading logs…" : "No matching log entries"}
          description="Try another level or refresh the log."
        />
      ) : (
        entries.map((entry) => {
          const style = styles[entry.level];
          const date = new Date(entry.timestamp);
          const time = Number.isNaN(date.getTime())
            ? ""
            : date.toLocaleTimeString(undefined, { hour12: false });
          return (
            <List.Item
              key={entry.id}
              title={entry.message.split("\n")[0]}
              icon={{ source: style.icon, tintColor: style.color }}
              keywords={[entry.source, entry.message, ...entry.raw]}
              accessories={[
                ...(entry.count > 1
                  ? [{ tag: { value: `×${entry.count}`, color: style.color } }]
                  : []),
                { text: time },
              ]}
              detail={
                <List.Item.Detail
                  markdown={logEntryMarkdown(entry)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Level">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={style.label}
                          color={style.color}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        title="Source"
                        text={entry.source}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Time"
                        text={entry.timestamp || "Not reported"}
                      />
                      {entry.count > 1 && (
                        <List.Item.Detail.Metadata.Label
                          title="Occurrences"
                          text={`${entry.count} · since ${entry.firstTimestamp || "unknown"}`}
                        />
                      )}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Log File"
                        text={data?.path ?? ""}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Log Entry"
                    content={entry.raw.join("\n\n")}
                    concealed
                  />
                  {commonActions}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
