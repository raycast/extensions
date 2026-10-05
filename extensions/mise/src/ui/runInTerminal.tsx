import { Action, closeMainWindow, Icon, type Keyboard, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "node:child_process";
import { terminalLaunches, type TerminalLaunch } from "../terminal/script";
import { readPreferences } from "./preferences";

export function RunInTerminalAction({
  command,
  title = "Run in Terminal",
  shortcut = { modifiers: ["cmd"], key: "t" },
}: {
  command: string;
  title?: string;
  shortcut?: Keyboard.Shortcut;
}) {
  return <Action title={title} icon={Icon.Terminal} shortcut={shortcut} onAction={() => runInTerminal(command)} />;
}

export async function runInTerminal(command: string): Promise<void> {
  const { terminalApp } = readPreferences();
  const shell = process.env.SHELL || "/bin/zsh";
  try {
    await launchFirstThatWorks(terminalLaunches(terminalApp?.bundleId, command, shell));
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not open ${terminalApp?.name ?? "Terminal"}`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function launchFirstThatWorks(launches: TerminalLaunch[]): Promise<void> {
  let failure: unknown;
  for (const launch of launches) {
    try {
      await run(launch);
      return;
    } catch (error) {
      failure = error;
    }
  }
  throw failure;
}

function run(launch: TerminalLaunch): Promise<void> {
  if (launch.kind === "applescript") return runAppleScript(launch.source).then(() => undefined);
  return new Promise((resolve, reject) => {
    execFile("open", launch.args, (error) => (error ? reject(error) : resolve()));
  });
}
