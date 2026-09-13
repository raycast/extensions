import { getSelectedFinderItems, showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, resolve } from "node:path";

type SessionMode = "new" | "continue" | "resume";

type LaunchPiOptions = {
  directory?: string;
  prompt?: string;
  sessionMode: SessionMode;
};

const terminalScript = String.raw`
on run argv
  set projectDirectory to item 1 of argv
  set sessionMode to item 2 of argv
  set initialPrompt to item 3 of argv

  set piCommand to "pi"
  if sessionMode is "continue" then
    set piCommand to piCommand & " --continue"
  else if sessionMode is "resume" then
    set piCommand to piCommand & " --resume"
  end if

  if initialPrompt is not "" then
    set piCommand to piCommand & " " & quoted form of initialPrompt
  end if

  set missingPiMessage to "Pi was not found in this shell. Install it with: npm install -g --ignore-scripts @earendil-works/pi-coding-agent"
  set terminalCommand to "cd " & quoted form of projectDirectory & " && if command -v pi >/dev/null 2>&1; then " & piCommand & "; else printf '\\n%s\\n\\n' " & quoted form of missingPiMessage & "; fi"

  tell application "Terminal"
    activate
    do script terminalCommand
  end tell
end run
`;

export async function launchPi(options: LaunchPiOptions): Promise<void> {
  try {
    const projectDirectory = await resolveProjectDirectory(options.directory);
    await runAppleScript(terminalScript, [projectDirectory, options.sessionMode, options.prompt?.trim() ?? ""]);
    await showHUD(`Opened Pi in ${basename(projectDirectory)}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open Pi" });
  }
}

async function resolveProjectDirectory(input?: string): Promise<string> {
  if (input?.trim()) {
    return toDirectory(expandPath(input.trim()));
  }

  try {
    const selectedItems = await getSelectedFinderItems();
    if (selectedItems[0]) {
      return toDirectory(selectedItems[0].path);
    }
  } catch {
    // Finder may not be running or Raycast may not have permission to inspect its selection.
  }

  return homedir();
}

function expandPath(input: string): string {
  if (input === "~") {
    return homedir();
  }

  if (input.startsWith("~/")) {
    return resolve(homedir(), input.slice(2));
  }

  return isAbsolute(input) ? input : resolve(homedir(), input);
}

async function toDirectory(path: string): Promise<string> {
  let pathStats;

  try {
    pathStats = await stat(path);
  } catch {
    throw new Error(`Project path does not exist: ${path}`);
  }

  return pathStats.isDirectory() ? path : dirname(path);
}
