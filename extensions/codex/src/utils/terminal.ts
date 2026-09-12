import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { shellQuote } from "./shell";

const quoteAppleScriptString = (value: string) =>
  `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

const terminalAppTitles: Record<Preferences["terminalApp"], string> = {
  terminal: "Terminal",
  ghostty: "Ghostty",
  iterm: "iTerm2",
};

export async function openTerminalAtPathWithCommand(
  path: string,
  command: string,
): Promise<void> {
  const { terminalApp } = getPreferenceValues<Preferences>();
  const script = buildTerminalScript(
    terminalApp,
    path,
    `cd ${shellQuote(path)} && ${command}`,
  );

  try {
    await runAppleScript(script);
  } catch {
    throw new Error(
      `Unable to open ${terminalAppTitles[terminalApp]}. Check the Terminal App preference.`,
    );
  }
}

function buildTerminalScript(
  terminalApp: Preferences["terminalApp"],
  path: string,
  command: string,
): string {
  const quotedCommand = quoteAppleScriptString(command);

  switch (terminalApp) {
    case "ghostty":
      // initial input keeps the shell open after Codex exits; command would not.
      return `
        tell application "Ghostty"
          activate
          new window with configuration {initial working directory:${quoteAppleScriptString(path)}, initial input:${quoteAppleScriptString(`${command}\n`)}}
        end tell
      `;
    case "iterm":
      return `
        tell application "iTerm"
          activate
          set newWindow to (create window with default profile)
          tell current session of newWindow
            write text ${quotedCommand}
          end tell
        end tell
      `;
    default:
      return `
        tell application "Terminal"
          activate
          do script ${quotedCommand}
        end tell
      `;
  }
}
