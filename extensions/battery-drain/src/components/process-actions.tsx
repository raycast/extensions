import { Action, ActionPanel, Alert, confirmAlert, Icon, open, showToast, Toast, Keyboard } from "@raycast/api";
import { userInfo } from "node:os";
import { canTerminate, sameProcess, starterTarget, terminate, TerminateResult } from "../actions/process";
import { run } from "../collectors/exec";
import { readProcesses } from "../collectors/ps";
import { ProcessInfo } from "../types";

type Target = { pid: number; command: string };

const MESSAGES: Record<TerminateResult, string> = {
  exited: "Process ended",
  "still-running": "Process is still running",
  "not-found": "Process already exited",
  "permission-denied": "Not allowed to end this process",
};

/** A process as the list showed it, with when it was seen, so a reused pid can be told apart. */
type Seen = { info?: ProcessInfo; at: number };

async function end(
  p: Target,
  seen: Seen,
  signal: "SIGTERM" | "SIGKILL",
  onDone: (quiet: boolean) => void,
  note?: string,
) {
  const force = signal === "SIGKILL";
  const confirmed = await confirmAlert({
    title: `${force ? "Force kill" : "Terminate"} ${p.command}?`,
    message: [`PID ${p.pid}. Unsaved work in this process may be lost.`, note].filter(Boolean).join("\n\n"),
    primaryAction: { title: force ? "Force Kill" : "Terminate", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;

  // The list can be seconds old and the dialog may have stayed open: check the pid still is that process.
  const now = await readProcesses([p.pid], run).catch(() => new Map<number, ProcessInfo>());
  if (seen.info && !sameProcess(seen.info, seen.at, now.get(p.pid), Date.now())) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${p.command} is no longer running`,
      message: "List refreshed",
    });
    onDone(true);
    return;
  }

  const result = await terminate(p.pid, signal);
  await showToast({
    style: result === "exited" || result === "not-found" ? Toast.Style.Success : Toast.Style.Failure,
    title: MESSAGES[result],
    message: result === "still-running" && !force ? "Try Force Kill" : undefined,
  });
  // Quiet: a "Refreshed" toast would replace this result, e.g. "Process is still running".
  onDone(true);
}

export function ProcessActions(props: {
  process: Target;
  info?: ProcessInfo;
  note?: string;
  starter?: { target: Target & { terminal?: true }; info?: ProcessInfo };
  /** When the list was collected; the pid is re-checked against it before a signal is sent. */
  seenAt: number;
  onRefresh: (quiet?: boolean) => void;
}) {
  const { process: p, info, note, seenAt, onRefresh } = props;
  const user = userInfo().username;
  const allowed = canTerminate(p, info, user);
  const starter = starterTarget(props.starter?.target, props.starter?.info, user);
  // The first action runs on Enter, so it must be harmless; terminating is kept behind shortcuts.
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Open Activity Monitor"
          icon={Icon.AppWindow}
          onAction={() => open("/System/Applications/Utilities/Activity Monitor.app")}
        />
        <Action.CopyToClipboard title="Copy PID" content={String(p.pid)} />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => onRefresh()}
        />
      </ActionPanel.Section>
      {(allowed || starter) && (
        <ActionPanel.Section title="Danger">
          {allowed && (
            <Action
              title="Terminate Process"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => end(p, { info, at: seenAt }, "SIGTERM", onRefresh, note)}
            />
          )}
          {allowed && (
            <Action
              title="Force Kill Process"
              icon={Icon.ExclamationMark}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={() => end(p, { info, at: seenAt }, "SIGKILL", onRefresh, note)}
            />
          )}
          {starter && (
            <Action
              // "Terminate", not "Quit": SIGTERM ends an app without its save prompts.
              title={`Terminate Starter (${starter.command})`}
              icon={Icon.XMarkTopRightSquare}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "opt"], key: "backspace" }}
              onAction={() =>
                end(
                  starter,
                  { info: props.starter?.info, at: seenAt },
                  "SIGTERM",
                  onRefresh,
                  starter.kind === "app"
                    ? `This ends ${starter.command}, which started ${p.command}, without its usual quit: unsaved documents are lost.`
                    : `${starter.command} is a command-line tool running in a terminal. Terminating it ends that terminal session and anything it was doing — if it is the tool you are working in right now, it closes too.`,
                )
              }
            />
          )}
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
