import { closeMainWindow, LocalStorage } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const exec = promisify(execFile);
export const CHROME = "Google Chrome";

export async function osascript(script: string): Promise<string> {
  const { stdout } = await exec("osascript", ["-e", script]);
  return stdout.trim();
}

// Window ids in front-to-back order.
export async function windowIds(): Promise<string[]> {
  const out = await osascript(`tell application "${CHROME}" to get id of every window`);
  return out ? out.split(/,\s*/) : [];
}

// Returns the id of Chrome's front window, or undefined when Chrome is not the frontmost app.
// Launched from Raycast's search, Raycast is still frontmost, so hide it and wait for focus to return.
export async function frontChromeWindowId(): Promise<string | undefined> {
  await closeMainWindow();
  for (let i = 0; i < 20; i++) {
    const out =
      await osascript(`tell application "System Events" to set frontApp to name of first application process whose frontmost is true
      if frontApp is "Raycast" then return "raycast"
      if frontApp is not "${CHROME}" then return ""
      tell application "${CHROME}" to return id of front window`);
    if (out !== "raycast") return out || undefined;
    await new Promise((r) => setTimeout(r, 50));
  }
  return undefined;
}

// Chrome's AppleScript can't tell app windows from normal ones, so remember the ones we opened.
const LITTLE_WINDOWS = "littleWindowIds";

export async function littleWindowIds(): Promise<Set<string>> {
  const stored: string[] = JSON.parse((await LocalStorage.getItem<string>(LITTLE_WINDOWS)) ?? "[]");
  const alive = new Set(await windowIds());
  return new Set(stored.filter((id) => alive.has(id)));
}

export async function addLittleWindowId(id: string): Promise<void> {
  const ids = await littleWindowIds();
  ids.add(id);
  await LocalStorage.setItem(LITTLE_WINDOWS, JSON.stringify([...ids]));
}
