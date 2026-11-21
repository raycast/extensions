import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execute = promisify(execFile);
export type CaptureAction = "start" | "stop" | "continue";
export const captureActions = {
  start: {
    name: "Raycast Cleft Start Recording",
    file: "Raycast Cleft Start Recording.shortcut",
    title: "Start Recording",
    intent: "NewCleftNoteIntent",
  },
  stop: {
    name: "Raycast Cleft Stop Recording",
    file: "Raycast Cleft Stop Recording.shortcut",
    title: "Stop Recording",
    intent: "StopCleftIntent",
  },
  continue: {
    name: "Raycast Cleft Continue Last Note",
    file: "Raycast Cleft Continue Last Note.shortcut",
    title: "Continue Last Note",
    intent: "ContinueNoteIntent",
  },
} as const;

export type ShortcutRunner = (arguments_: string[]) => Promise<string>;
export const runShortcutProcess: ShortcutRunner = async (arguments_) => {
  const { stdout } = await execute("/usr/bin/shortcuts", arguments_, {
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });
  return stdout;
};

export function shortcutName(
  action: CaptureAction,
  preference?: string,
): string {
  const name = preference?.trim() || captureActions[action].name;
  if (name.length > 200 || /[\r\n\0]/.test(name))
    throw new Error(
      "Choose a valid Apple Shortcut name in extension settings.",
    );
  return name;
}

export async function runCapture(
  action: CaptureAction,
  preference?: string,
  runner = runShortcutProcess,
): Promise<void> {
  const name = shortcutName(action, preference);
  const shortcuts = (await runner(["list"])).split(/\r?\n/);
  if (!shortcuts.includes(name))
    throw new Error(
      `Install “${name}” with Configure Cleft Integration, or choose your own native Cleft shortcut in extension settings.`,
    );
  await runner(["run", name]);
}
