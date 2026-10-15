import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  frpDirExists,
  getPrefs,
  matchesLogFilter,
  readLogLines,
  resolveLogPath,
  type LogLine,
} from "./frp";
import { MissingFrpDir } from "./components";

type Filter = "all" | "error" | "warning" | "info";

export default function Command() {
  const [filter, setFilter] = useState<Filter>("all");
  const prefs = getPrefs();
  const { data: logPath } = useCachedPromise(resolveLogPath, [prefs.frpDir]);
  const { data, isLoading, revalidate } = useCachedPromise(
    readLogLines,
    [logPath ?? ""],
    {
      execute: Boolean(logPath),
    },
  );
  const lines = (data ?? []).filter((line) => matchesLogFilter(line, filter));

  if (!frpDirExists()) {
    return (
      <List>
        <MissingFrpDir frpDir={prefs.frpDir} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || !logPath}
      searchBarPlaceholder="Filter log lines"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Log level"
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Error" value="error" />
          <List.Dropdown.Item title="Warning" value="warning" />
          <List.Dropdown.Item title="Info" value="info" />
        </List.Dropdown>
      }
    >
      {lines.length === 0 ? (
        <List.EmptyView title="No log lines" description={logPath ?? ""} />
      ) : (
        lines
          .slice()
          .reverse()
          .map((line, index) => (
            <List.Item
              key={`${line.time ?? "t"}-${index}-${line.message.slice(0, 24)}`}
              title={line.message || line.raw}
              subtitle={line.time}
              icon={levelIcon(line)}
              accessories={
                line.level
                  ? [
                      {
                        tag: {
                          value: line.level,
                          color: levelColor(line.level),
                        },
                      },
                    ]
                  : []
              }
              actions={
                <LogActions logPath={logPath ?? ""} revalidate={revalidate} />
              }
            />
          ))
      )}
    </List>
  );
}

function LogActions({
  logPath,
  revalidate,
}: {
  logPath: string;
  revalidate: () => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
      />
      <Action.ShowInFinder title="Reveal Log in Finder" path={logPath} />
      <Action.Open title="Open in Editor" target={logPath} />
    </ActionPanel>
  );
}

function levelIcon(line: LogLine) {
  if (line.level === "E") {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
  if (line.level === "W") {
    return { source: Icon.Warning, tintColor: Color.Orange };
  }
  if (line.level === "I") {
    return { source: Icon.Info, tintColor: Color.Blue };
  }
  return Icon.Minus;
}

function levelColor(level: "I" | "W" | "E"): Color {
  if (level === "E") {
    return Color.Red;
  }
  if (level === "W") {
    return Color.Orange;
  }
  return Color.Blue;
}
