import { Action, closeMainWindow, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

import type { GroundcrewStatusWorktree } from "../types/groundcrew";

// cmux ships its CLI inside the app bundle; that absolute path works even under
// Raycast's stripped PATH. Fall back to common Homebrew locations.
const CMUX_CANDIDATES = [
  "/Applications/cmux.app/Contents/Resources/bin/cmux",
  "/opt/homebrew/bin/cmux",
  "/usr/local/bin/cmux",
];

interface CmuxWorkspace {
  ref?: string;
  custom_title?: string;
  current_directory?: string;
}

function resolveCmux(): string | undefined {
  return CMUX_CANDIDATES.find((candidate) => existsSync(candidate));
}

function runCommand(command: string, args: readonly string[]): Promise<{ code: number | null; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { stdio: ["ignore", "pipe", "ignore"] });
    let stdout = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code, stdout }));
  });
}

/**
 * Focus the task's EXISTING cmux workspace (crew already opened one, titled by the
 * task id, with `current_directory` = the worktree). Match it in `workspace list`
 * and `workspace select` it; only create a new workspace if none matches.
 */
async function openTaskInCmux({ dir, taskId }: { dir: string; taskId: string }): Promise<void> {
  const cmux = resolveCmux();
  if (cmux === undefined) {
    // No CLI found — let LaunchServices open/create a workspace for the directory.
    await runCommand("/usr/bin/open", ["-a", "cmux", dir]);
    return;
  }

  let selectedRef: string | undefined;
  try {
    const { stdout } = await runCommand(cmux, ["workspace", "list", "--json"]);
    const workspaces = (JSON.parse(stdout) as { workspaces?: CmuxWorkspace[] }).workspaces ?? [];
    const match = workspaces.find(
      (workspace) => workspace.current_directory === dir || workspace.custom_title === taskId,
    );
    selectedRef = match?.ref;
  } catch {
    selectedRef = undefined;
  }

  if (selectedRef === undefined) {
    await runCommand(cmux, ["open", dir]);
  } else {
    await runCommand(cmux, ["workspace", "select", selectedRef]);
  }
  // Bring cmux to the foreground regardless of select vs create.
  await runCommand("/usr/bin/open", ["-a", "cmux"]);
}

/**
 * Attach to a task's multiplexer session by running its `attachCommand` in Terminal.
 * `crew` emits the exact command (e.g. `tmux attach -t <task>`), so nothing is
 * reverse-engineered. Terminal runs a login shell, so `tmux` resolves there.
 */
function attachInTerminal(command: string): Promise<void> {
  const escaped = command.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = `tell application "Terminal"\nactivate\ndo script "${escaped}"\nend tell`;
  return runCommand("/usr/bin/osascript", ["-e", script]).then(({ code }) => {
    if (code !== 0) {
      throw new Error(`osascript exited ${code}`);
    }
  });
}

/**
 * Jump-in and copy actions for a task's local worktree(s): focus the worktree's cmux
 * workspace, open it in an editor, attach to its session, and copy branch / path / id.
 */
export function WorkspaceActions({
  attachCommand,
  taskId,
  worktrees,
}: {
  attachCommand?: string;
  taskId: string;
  worktrees: readonly GroundcrewStatusWorktree[];
}) {
  const { editorApp } = getPreferenceValues<Preferences>();
  const dirs = worktrees.filter((worktree) => worktree.dir.trim().length > 0);
  const editor = editorApp?.trim();
  const primary = dirs[0];
  return (
    <>
      {dirs.map((worktree) => (
        <Action
          key={`cmux:${worktree.dir}`}
          title={dirs.length === 1 ? "Open in Cmux" : `Open ${worktree.repository} in Cmux`}
          icon={Icon.Terminal}
          onAction={async () => {
            try {
              await closeMainWindow();
              await openTaskInCmux({ dir: worktree.dir.trim(), taskId });
            } catch {
              await showToast({ style: Toast.Style.Failure, title: "Couldn’t Open Cmux" });
            }
          }}
        />
      ))}
      {dirs.map((worktree) =>
        editor === undefined || editor.length === 0 ? (
          <Action.OpenWith
            key={`editor:${worktree.dir}`}
            title={dirs.length === 1 ? "Open Worktree with…" : `Open ${worktree.repository} Worktree With…`}
            path={worktree.dir.trim()}
          />
        ) : (
          <Action.Open
            key={`editor:${worktree.dir}`}
            title={dirs.length === 1 ? "Open in Editor" : `Open ${worktree.repository} in Editor`}
            icon={Icon.Code}
            target={worktree.dir.trim()}
            application={editor}
          />
        ),
      )}
      {attachCommand === undefined ? null : (
        <Action
          title="Attach to Session in Terminal"
          icon={Icon.Terminal}
          onAction={async () => {
            try {
              await closeMainWindow();
              await attachInTerminal(attachCommand);
            } catch {
              await showToast({
                style: Toast.Style.Failure,
                title: "Couldn’t Open Terminal",
                message: "Copy the attach command and run it manually.",
              });
            }
          }}
        />
      )}
      {attachCommand === undefined ? null : (
        <Action.CopyToClipboard title="Copy Attach Command" content={attachCommand} />
      )}
      {primary?.branch === undefined ? null : (
        <Action.CopyToClipboard title="Copy Branch Name" content={primary.branch} />
      )}
      {primary === undefined ? null : (
        <Action.CopyToClipboard title="Copy Worktree Path" content={primary.dir.trim()} />
      )}
      <Action.CopyToClipboard title="Copy Task ID" content={taskId} />
    </>
  );
}
