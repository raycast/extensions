import { Action, ActionPanel, Clipboard, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { Instance, isRunning } from "../lib/instance";
import { listInstances, openInTerminal, openShell, startInstance } from "../lib/lima";
import { followCommand, Level, lineText, Log, LogLine, LogSource, readLog, readLogs, SOURCE_TITLES } from "../lib/logs";
import { useTasks } from "../lib/tasks";
import { ExtensionActions } from "./extension-actions";

/** How often the logs are read again while the instance runs. */
const REFRESH_MS = 2000;

type LevelFilter = "all" | "problems";

const MARKS: Record<Level, string> = { error: "✖", warn: "▲", info: " ", debug: "·" };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The instance as it is now, with its logs, so a start from here shows up on the next read. */
async function load(name: string): Promise<{ instance?: Instance; logs?: Record<LogSource, Log> }> {
  const instance = (await listInstances()).find((entry) => entry.name === name);
  return { instance, logs: instance && (await readLogs(instance)) };
}

function shown(log: Log, search: string, filter: LevelFilter): LogLine[] {
  const needle = search.trim().toLowerCase();
  return log.lines.filter(
    (line) =>
      (filter === "all" || line.level === "error" || line.level === "warn") &&
      (!needle || lineText(line).toLowerCase().includes(needle)),
  );
}

/**
 * Newest first: Raycast's panel opens at the top and can't be scrolled to the end from here.
 * Raycast's markdown can't colour a line, so errors and warnings are marked ✖ and ▲.
 */
function markdown(log: Log, lines: LogLine[], filtered: boolean): string {
  if (log.unavailable) return log.unavailable;
  if (!lines.length) return filtered ? "No lines match." : "This log is empty.";
  const body = [...lines]
    .reverse()
    .map((line) => [line.time, line.level ? MARKS[line.level] : " ", line.text].filter(Boolean).join(" "))
    .join("\n")
    .replace(/```/g, "'''");
  return `\`\`\`\n${body}\n\`\`\``;
}

function errorCount(log: Log): number {
  return log.lines.filter((line) => line.level === "error").length;
}

/** docker logs for a Lima instance: its host agent log, serial console and provision output. */
export function LogsView({ name }: { name: string }) {
  const { data, isLoading, revalidate } = usePromise(load, [name], {
    failureToastOptions: { title: "Couldn't read the logs" },
  });
  const { pending, run } = useTasks(revalidate);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LevelFilter>("all");
  const instance = data?.instance;
  const running = !!instance && isRunning(instance);

  // Live while it runs, like docker logs -f. A stopped instance writes nothing new.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(revalidate, REFRESH_MS);
    return () => clearInterval(timer);
  }, [running]);

  const logs = useMemo(() => (data?.logs ? Object.values(data.logs) : []), [data]);

  async function copyEntire(log: Log) {
    if (!instance) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Copying the log..." });
    try {
      const full = await readLog(instance, log.source, "all");
      await Clipboard.copy(full.lines.map(lineText).join("\n"));
      toast.style = Toast.Style.Success;
      toast.title = `Copied ${full.lines.length} lines`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't copy the log";
      toast.message = errorMessage(error);
    }
  }

  async function follow(log: Log) {
    if (!instance) return;
    try {
      await openInTerminal(followCommand(instance, log));
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Couldn't open a terminal", message: errorMessage(error) });
    }
  }

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );

  return (
    <List
      isLoading={isLoading || !!pending[name]}
      isShowingDetail={logs.length > 0}
      navigationTitle={`${name} · Logs`}
      filtering={false}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Filter lines"
      searchBarAccessory={
        <List.Dropdown tooltip="Levels" value={filter} onChange={(value) => setFilter(value as LevelFilter)}>
          <List.Dropdown.Item title="All Levels" value="all" icon={Icon.AppWindowList} />
          <List.Dropdown.Item
            title="Warnings and Errors"
            value="problems"
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          />
        </List.Dropdown>
      }
    >
      {!isLoading && !instance && (
        <List.EmptyView
          icon={Icon.QuestionMarkCircle}
          title={`No Instance Named ${name}`}
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      )}
      {instance && (
        <List.Section title={instance.name} subtitle={instance.status}>
          {logs.map((log) => {
            const lines = shown(log, search, filter);
            const text = lines.map(lineText).join("\n");
            const errors = errorCount(log);
            const accessory: List.Item.Accessory =
              log.source === "provision"
                ? log.unavailable
                  ? { text: running ? "unreadable" : "needs it running", tooltip: log.unavailable }
                  : errors
                    ? { tag: { value: "Failed", color: Color.Red }, tooltip: `${errors} error lines` }
                    : { text: "in the VM" }
                : errors
                  ? { text: { value: `${errors} ${errors === 1 ? "error" : "errors"}`, color: Color.Red } }
                  : { text: log.path?.split("/").pop() ?? "" };
            const startable = log.source === "provision" && !running && !pending[name];
            return (
              <List.Item
                key={log.source}
                id={log.source}
                title={SOURCE_TITLES[log.source]}
                icon={log.source === "lima" ? Icon.HardDrive : log.source === "console" ? Icon.Terminal : Icon.Document}
                accessories={[accessory]}
                detail={<List.Item.Detail markdown={markdown(log, lines, !!search.trim() || filter !== "all")} />}
                actions={
                  <ActionPanel title={`${SOURCE_TITLES[log.source]} · ${instance.name}`}>
                    <ActionPanel.Section>
                      {startable ? (
                        <Action
                          title="Start"
                          icon={Icon.Play}
                          onAction={() => run(name, "Starting", () => startInstance(name), "Started")}
                        />
                      ) : (
                        !log.unavailable && (
                          <Action title="Follow in Terminal" icon={Icon.Terminal} onAction={() => follow(log)} />
                        )
                      )}
                      {lines.length > 0 && <Action.CopyToClipboard title="Copy Logs" content={text} />}
                      {!log.unavailable && (
                        <Action
                          title="Copy Entire Log"
                          icon={Icon.CopyClipboard}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                          onAction={() => copyEntire(log)}
                        />
                      )}
                      {log.path && (
                        <Action.Open
                          title="Open Log File"
                          icon={Icon.Document}
                          target={log.path}
                          shortcut={Keyboard.Shortcut.Common.Open}
                        />
                      )}
                      {log.path && (
                        <Action.ShowInFinder path={log.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {running && (
                        <Action
                          title="Open Shell"
                          icon={Icon.Terminal}
                          shortcut={{ modifiers: ["opt", "cmd"], key: "return" }}
                          onAction={() => openShell(name)}
                        />
                      )}
                      {refreshAction}
                    </ActionPanel.Section>
                    <ExtensionActions />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
