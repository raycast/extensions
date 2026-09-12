import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  open,
  showInFinder,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readRegistry } from "../profiles/autoCleanup";
import { reportError } from "../utils/reportError";
import { type BufferedRow, collapseConsecutive, type DisplayRow, expandWithoutDedupe } from "./dedupe";
import { type LogRow, reconstructStructuredLine, rowSourceText, type StructuredLine } from "./parser";
import { severityMeta } from "./severity";
import { createTailer } from "./tailer";
import { useProcessPresence } from "./useProcessPresence";

const execFileAsync = promisify(execFile);

const BUFFER_MAX = 2000;
const PROFILE_POLL_INTERVAL_MS = 2000;
const SEVERITY_FILTERS = [
  { value: "all", title: "All" },
  { value: "ERROR", title: "Errors" },
  { value: "WARNING", title: "Warnings" },
  { value: "INFO", title: "Info" },
  { value: "RAW", title: "Raw" },
] as const;
type SeverityFilter = (typeof SEVERITY_FILTERS)[number]["value"];

type TailerState = "INIT" | "WAITING" | "LIVE" | "ENDED_PERSISTENT" | "SWEPT" | "ORPHANED" | "LOG_GONE";

type LogViewerProps = { profileDir: string };

let idCounter = 0;
function nextRowId(): string {
  idCounter += 1;
  return `row-${idCounter}`;
}

function computeTailerState(
  logFileExists: boolean | null,
  profileDirExists: boolean | null,
  inUse: boolean,
  fileEverExisted: boolean,
): TailerState {
  if (logFileExists === null || profileDirExists === null) {
    return "INIT";
  }
  if (!profileDirExists) {
    return inUse ? "ORPHANED" : "SWEPT";
  }
  if (!logFileExists) {
    if (inUse) {
      return fileEverExisted ? "LOG_GONE" : "WAITING";
    }
    return "ENDED_PERSISTENT";
  }
  return inUse ? "LIVE" : "ENDED_PERSISTENT";
}

function statusSuffix(state: TailerState): string {
  switch (state) {
    case "LIVE":
      return "tailing";
    case "WAITING":
      return "waiting for first line";
    case "ENDED_PERSISTENT":
      return "ended";
    case "SWEPT":
      return "session cleaned up";
    case "ORPHANED":
      return "profile removed";
    case "LOG_GONE":
      return "log removed";
    default:
      return "…";
  }
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

function truncateForTitle(text: string, max = 200): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

function timestampForFilename(): string {
  const now = new Date();
  const pad = (n: number): string => n.toString().padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

// The runner path arrives as an argument rather than spliced into this source,
// so no AppleScript escaping is involved and the script text stays constant.
// `quoted form of` is AppleScript's own shell quoting.
const OPEN_IN_TERMINAL_SCRIPT = `on run argv
  tell application "Terminal"
    activate
    do script "sh " & quoted form of (item 1 of argv)
  end tell
end run`;

/** Wraps a value in single quotes so the shell treats every character literally. */
function shellQuote(value: string): string {
  return `'${value.split("'").join(`'\\''`)}'`;
}

async function openInTerminal(logPath: string): Promise<void> {
  // Terminal's `do script` types its argument into a tty, and the tty line
  // discipline rewrites the text: it turns CR into LF, and TAB triggers shell
  // completion. Quoting cannot survive that, and a rewritten path would make
  // `tail` silently follow the wrong file. So the command goes into a runner
  // script that `sh` parses directly, and Terminal only ever receives that
  // runner's own path, which this code chooses and keeps free of such
  // characters. Profile directory names come from a world-writable temp
  // directory, so they stay untrusted and are never parsed as code.
  const runnerPath = path.join(os.tmpdir(), `tempchrome-tail-${process.pid}-${Date.now()}.sh`);
  const runner = `#!/bin/sh
rm -f -- "$0"
exec tail -F ${shellQuote(logPath)}
`;
  await fs.promises.writeFile(runnerPath, runner, { mode: 0o700 });
  try {
    await execFileAsync("osascript", ["-e", OPEN_IN_TERMINAL_SCRIPT, runnerPath]);
  } catch (error) {
    // The runner deletes itself once it runs, so only a failed launch leaves it.
    await fs.promises.rm(runnerPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function severityOf(row: LogRow): string {
  return row.type === "structured" ? (row as StructuredLine).level : "RAW";
}

function matchesSeverity(row: LogRow, filter: SeverityFilter): boolean {
  if (filter === "all") {
    return true;
  }
  return severityOf(row) === filter;
}

export default function LogViewer({ profileDir }: LogViewerProps): JSX.Element {
  const logPath = useMemo(() => path.join(profileDir, "chrome_debug.log"), [profileDir]);
  const profileBasename = useMemo(() => path.basename(profileDir), [profileDir]);

  const [buffer, setBuffer] = useState<BufferedRow[]>([]);
  const [dedupe, setDedupe] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [autoFollow, setAutoFollow] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [logFileExists, setLogFileExists] = useState<boolean | null>(null);
  const [profileDirExists, setProfileDirExists] = useState<boolean | null>(null);
  const [fileEverExisted, setFileEverExisted] = useState(false);
  const [condemned, setCondemned] = useState(false);
  const [skippedOlder, setSkippedOlder] = useState(false);

  const inUse = useProcessPresence(profileDir, PROFILE_POLL_INTERVAL_MS);
  const autoFollowRef = useRef(autoFollow);
  autoFollowRef.current = autoFollow;

  const tailerState = computeTailerState(logFileExists, profileDirExists, inUse, fileEverExisted);
  const frozen = tailerState === "SWEPT" || tailerState === "ORPHANED";

  useEffect(() => {
    if (frozen) {
      return;
    }

    const tailer = createTailer({
      logPath,
      onLines: (rows) => {
        setLogFileExists(true);
        setFileEverExisted(true);
        const received = Date.now();
        const buffered: BufferedRow[] = rows.map((row) => ({
          id: nextRowId(),
          row,
          receivedAt: received,
        }));
        setBuffer((previous) => {
          const combined = previous.concat(buffered);
          if (combined.length <= BUFFER_MAX) {
            return combined;
          }
          return combined.slice(combined.length - BUFFER_MAX);
        });
      },
      onStateChange: (change) => {
        if (change.fileMissing) {
          setLogFileExists(false);
        }
        if (change.truncated) {
          setBuffer([]);
          void showToast({
            style: Toast.Style.Success,
            title: "Log was truncated — re-reading from start",
          });
        }
        if (change.skippedOlder) {
          setSkippedOlder(true);
        }
      },
    });
    tailer.start();
    return () => {
      tailer.stop();
    };
  }, [logPath, frozen]);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        await fs.promises.stat(profileDir);
        if (!cancelled) setProfileDirExists(true);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          if (!cancelled) setProfileDirExists(false);
        }
      }
      try {
        await fs.promises.stat(logPath);
        if (!cancelled) {
          setLogFileExists(true);
          setFileEverExisted(true);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT" && !cancelled) {
          setLogFileExists(false);
        }
      }
    }

    void poll();
    const intervalId = setInterval(() => void poll(), PROFILE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [logPath, profileDir]);

  useEffect(() => {
    if (tailerState !== "ENDED_PERSISTENT") {
      setCondemned(false);
      return;
    }
    let cancelled = false;
    readRegistry()
      .then((registry) => {
        if (!cancelled) setCondemned(profileDir in registry);
      })
      .catch((error) => {
        void reportError("readRegistry failed", error, { silent: true });
      });
    return () => {
      cancelled = true;
    };
  }, [tailerState, profileDir]);

  const displayRows: DisplayRow[] = useMemo(() => {
    const filtered = buffer.filter((buffered) => matchesSeverity(buffered.row, severityFilter));
    return dedupe ? collapseConsecutive(filtered) : expandWithoutDedupe(filtered);
  }, [buffer, dedupe, severityFilter]);

  const newestDisplayId = displayRows.length > 0 ? displayRows[displayRows.length - 1].id : undefined;
  const newestIdRef = useRef<string | undefined>(newestDisplayId);

  useEffect(() => {
    if (autoFollowRef.current && newestDisplayId && newestDisplayId !== newestIdRef.current) {
      setSelectedItemId(newestDisplayId);
    }
    newestIdRef.current = newestDisplayId;
  }, [newestDisplayId]);

  const handleSelectionChange = useCallback((id: string | null) => {
    if (!id || id.startsWith("banner-")) {
      return;
    }
    if (!newestIdRef.current) {
      return;
    }
    if (autoFollowRef.current && id !== newestIdRef.current) {
      setAutoFollow(false);
    }
    setSelectedItemId(id);
  }, []);

  const jumpToTail = useCallback(() => {
    if (newestIdRef.current) {
      setSelectedItemId(newestIdRef.current);
    }
    setAutoFollow(true);
  }, []);

  const toggleDedupe = useCallback(() => {
    setDedupe((previous) => {
      const next = !previous;
      void showToast({
        style: Toast.Style.Success,
        title: next ? "Dedup on" : "Dedup off",
      });
      return next;
    });
  }, []);

  const copyLine = useCallback(async (display: DisplayRow) => {
    const text = rowSourceText(display.row);
    await Clipboard.copy(text);
    await showToast({ style: Toast.Style.Success, title: "Copied line" });
  }, []);

  const copyWithContext = useCallback(
    async (display: DisplayRow) => {
      const index = displayRows.findIndex((candidate) => candidate.id === display.id);
      if (index === -1) {
        return;
      }
      const from = Math.max(0, index - 5);
      const to = Math.min(displayRows.length, index + 6);
      const lines = displayRows.slice(from, to).map((candidate) => rowSourceText(candidate.row));
      await Clipboard.copy(lines.join("\n"));
      await showToast({
        style: Toast.Style.Success,
        title: "Copied line with ±5 context",
      });
    },
    [displayRows],
  );

  const saveBuffer = useCallback(async () => {
    if (buffer.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing to save" });
      return;
    }
    try {
      const targetPath = path.join(
        os.homedir(),
        "Downloads",
        `tempchrome-${profileBasename}-${timestampForFilename()}.log`,
      );
      const content = buffer.map((buffered) => rowSourceText(buffered.row)).join("\n");
      await fs.promises.writeFile(targetPath, content, { mode: 0o644 });
      const toast = await showToast({
        style: Toast.Style.Success,
        title: `Saved ${formatCount(buffer.length)} lines`,
      });
      toast.primaryAction = {
        title: "Show in Finder",
        onAction: () => void showInFinder(targetPath),
      };
    } catch (error) {
      await showFailureToast(error, { title: "Failed to save buffer" });
    }
  }, [buffer, profileBasename]);

  const revealInFinder = useCallback(async () => {
    try {
      await showInFinder(logPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Revealed in Finder",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to reveal" });
    }
  }, [logPath]);

  const openLogInTerminal = useCallback(async () => {
    try {
      await openInTerminal(logPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Opened in Terminal",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to open in Terminal" });
    }
  }, [logPath]);

  const openProfileDir = useCallback(async () => {
    try {
      await open(profileDir);
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to open profile directory",
      });
    }
  }, [profileDir]);

  const canTouchDisk = tailerState !== "SWEPT" && tailerState !== "ORPHANED";

  const bannerRows: JSX.Element[] = [];
  if (condemned && tailerState === "ENDED_PERSISTENT") {
    bannerRows.push(
      <List.Item
        key="banner-condemned"
        id="banner-condemned"
        title="⚠ This profile is marked for auto-cleanup"
        subtitle="The next TempChrome launch will remove this log. Use ⌘S to save the buffer first."
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
        accessories={[{ icon: { source: Icon.ExclamationMark, tintColor: Color.Yellow } }]}
        actions={
          <ActionPanel>
            <Action
              title="Save Buffer to Downloads…"
              icon={Icon.SaveDocument}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={saveBuffer}
            />
          </ActionPanel>
        }
      />,
    );
  }
  if (tailerState === "ENDED_PERSISTENT") {
    bannerRows.push(
      <List.Item
        key="banner-ended"
        id="banner-ended"
        title="Session ended"
        subtitle={`Log file preserved at ${logPath}`}
        icon={{ source: Icon.CircleDisabled, tintColor: Color.SecondaryText }}
      />,
    );
  } else if (tailerState === "SWEPT") {
    bannerRows.push(
      <List.Item
        key="banner-swept"
        id="banner-swept"
        title="Session ended and profile was auto-cleaned"
        subtitle="Showing buffered lines from memory — navigate away to lose them."
        icon={{ source: Icon.Trash, tintColor: Color.Orange }}
      />,
    );
  } else if (tailerState === "ORPHANED") {
    bannerRows.push(
      <List.Item
        key="banner-orphaned"
        id="banner-orphaned"
        title="Profile directory was removed externally"
        subtitle="Chromium is still running but its log file is unreachable. Data written after this point is lost."
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
      />,
    );
  } else if (tailerState === "LOG_GONE") {
    bannerRows.push(
      <List.Item
        key="banner-loggone"
        id="banner-loggone"
        title="Log file was removed externally"
        subtitle="Chromium is still running; restart it to resume logging."
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
      />,
    );
  }
  if (skippedOlder) {
    bannerRows.push(
      <List.Item
        key="banner-skipped"
        id="banner-skipped"
        title="Showing last 5 MB of log"
        subtitle="Older lines exist on disk — use Reveal in Finder to open the whole file."
        icon={{ source: Icon.Info, tintColor: Color.Blue }}
      />,
    );
  }

  const linesSuffix = autoFollow ? "" : " · paused";
  const searchBarPlaceholder = `${formatCount(buffer.length)} lines · ${statusSuffix(tailerState)}${linesSuffix}`;

  const severityDropdown = (
    <List.Dropdown
      tooltip="Filter by severity"
      value={severityFilter}
      onChange={(value) => setSeverityFilter(value as SeverityFilter)}
    >
      {SEVERITY_FILTERS.map((filter) => (
        <List.Dropdown.Item key={filter.value} title={filter.title} value={filter.value} />
      ))}
    </List.Dropdown>
  );

  const showWaitingEmpty = tailerState === "WAITING" && buffer.length === 0;

  return (
    <List
      isShowingDetail
      navigationTitle={`Chromium Log · ${profileBasename}`}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={severityDropdown}
      selectedItemId={selectedItemId}
      onSelectionChange={handleSelectionChange}
    >
      {bannerRows}
      {showWaitingEmpty ? (
        <List.EmptyView
          title="Waiting for first log line…"
          description="Chromium is running but has not written anything yet."
          icon={{ source: Icon.Hourglass, tintColor: Color.Blue }}
        />
      ) : (
        displayRows.map((display) => {
          const row = display.row;
          const severity = severityOf(row);
          const meta = severityMeta(severity);
          const titleText =
            row.type === "structured"
              ? (row as StructuredLine).message
              : (row as Extract<LogRow, { type: "raw" }>).text;
          const accessories: List.Item.Accessory[] = [];
          if (display.count > 1) {
            accessories.push({
              tag: { value: `×${display.count}`, color: Color.Orange },
            });
          }

          const reconstructed =
            row.type === "structured"
              ? reconstructStructuredLine(row as StructuredLine)
              : (row as Extract<LogRow, { type: "raw" }>).text;
          const metadata =
            row.type === "structured" ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Severity" text={meta.label} />
                <List.Item.Detail.Metadata.Label title="PID" text={(row as StructuredLine).pid} />
                <List.Item.Detail.Metadata.Label title="TID" text={(row as StructuredLine).tid} />
                <List.Item.Detail.Metadata.Label
                  title="Date / Time"
                  text={`${(row as StructuredLine).date} / ${(row as StructuredLine).time}`}
                />
                <List.Item.Detail.Metadata.Label
                  title="Source"
                  text={`${(row as StructuredLine).sourceFile}:${(row as StructuredLine).sourceLine}`}
                />
                {display.count > 1 && display.firstTime && display.lastTime ? (
                  <List.Item.Detail.Metadata.Label
                    title="Time Span"
                    text={`${display.firstTime} → ${display.lastTime}`}
                  />
                ) : null}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Message" text={(row as StructuredLine).message} />
              </List.Item.Detail.Metadata>
            ) : (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Severity" text="Raw" />
                {display.count > 1 ? (
                  <List.Item.Detail.Metadata.Label title="Count" text={`×${display.count}`} />
                ) : null}
              </List.Item.Detail.Metadata>
            );

          return (
            <List.Item
              key={display.id}
              id={display.id}
              title={truncateForTitle(titleText)}
              icon={{ source: meta.icon, tintColor: meta.tint }}
              accessories={accessories}
              detail={<List.Item.Detail markdown={"```\n" + reconstructed + "\n```"} metadata={metadata} />}
              actions={
                <ActionPanel>
                  <Action title="Copy Line" icon={Icon.CopyClipboard} onAction={() => void copyLine(display)} />
                  <Action
                    title="Copy with Context"
                    icon={Icon.CopyClipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    onAction={() => void copyWithContext(display)}
                  />
                  <Action
                    title="Save Buffer to Downloads…"
                    icon={Icon.SaveDocument}
                    shortcut={Keyboard.Shortcut.Common.Save}
                    onAction={saveBuffer}
                  />
                  <Action
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title={dedupe ? "Toggle Dedup Off" : "Toggle Dedup On"}
                    icon={Icon.LineChart}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={toggleDedupe}
                  />
                  <Action
                    title="Jump to Tail"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                    onAction={jumpToTail}
                  />
                  {canTouchDisk ? (
                    <Action
                      title="Reveal in Finder"
                      icon={Icon.Finder}
                      shortcut={Keyboard.Shortcut.Common.OpenWith}
                      onAction={() => void revealInFinder()}
                    />
                  ) : null}
                  {canTouchDisk ? (
                    <Action
                      title="Open in Terminal"
                      icon={Icon.Terminal}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                      onAction={() => void openLogInTerminal()}
                    />
                  ) : null}
                  {canTouchDisk ? (
                    <Action
                      title="Open Profile Directory"
                      icon={Icon.Folder}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={() => void openProfileDir()}
                    />
                  ) : null}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
