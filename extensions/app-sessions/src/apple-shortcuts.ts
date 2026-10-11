import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ParsedRaycastCommand } from "./raycast-commands";

const execFileAsync = promisify(execFile);
const SHORTCUTS_CLI = "/usr/bin/shortcuts";
const PROCESS_ENV = { ...process.env, PATH: "/usr/bin:/bin:/usr/sbin:/sbin" };

export async function listAppleShortcuts(): Promise<string[]> {
  const { stdout } = await execFileAsync(SHORTCUTS_CLI, ["list"], { env: PROCESS_ENV, timeout: 10_000 });

  return stdout
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);
}

export async function runAppleShortcut(
  shortcutName: string,
  launch: (command: ParsedRaycastCommand) => Promise<void>,
): Promise<void> {
  await launch({
    ownerOrAuthorName: "raycast",
    extensionName: "apple-shortcuts",
    name: slugify(shortcutName),
  });
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
