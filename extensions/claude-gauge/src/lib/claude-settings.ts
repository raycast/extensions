import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveClaudeConfigDir } from "./statusline-cache";

/**
 * Reads and (add-only) wires the `statusLine` key in the user's Claude Code
 * settings.json so Claude Code invokes the status line script that writes the
 * Claude Gauge cache.
 *
 * SAFETY: this is strictly add-only. An existing `statusLine` is NEVER touched,
 * a `.bak` backup is written before any modification, malformed JSON is left
 * alone (we refuse to edit it), and nothing here runs automatically — it is
 * only called from an explicit user Action in `session.tsx`.
 */

/** Absolute path to the user's Claude Code settings.json. */
export function settingsJsonPath(): string {
  return join(resolveClaudeConfigDir(), "settings.json");
}

/** The statusLine config object that points Claude Code at `scriptPath`. */
export function statusLineConfig(scriptPath: string): {
  type: "command";
  command: string;
} {
  // Quote the path so a config dir containing spaces still resolves correctly.
  return { type: "command", command: `sh "${scriptPath}"` };
}

/** Pretty-printed snippet for the user to paste into settings.json by hand. */
export function statusLineSnippet(scriptPath: string): string {
  return JSON.stringify({ statusLine: statusLineConfig(scriptPath) }, null, 2);
}

export type WireResult =
  | { status: "wired"; backupPath: string; settingsPath: string }
  | {
      status: "already";
      settingsPath: string;
      /** Does the pre-existing statusLine already point at `scriptPath`? */
      pointsAtScript: boolean;
    }
  | { status: "error"; message: string; settingsPath: string };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Ensure settings.json has a `statusLine` pointing at `scriptPath`. Add-only:
 * if `statusLine` already exists it is left completely untouched. A `.bak`
 * backup is written before any modification. Never throws — failures are
 * returned as `{ status: "error" }` so the caller can guide a manual edit.
 */
export async function wireStatusLine(scriptPath: string): Promise<WireResult> {
  const settingsPath = settingsJsonPath();

  let raw: string | null = null;
  try {
    raw = await readFile(settingsPath, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== "ENOENT") {
      return {
        status: "error",
        message: e.message || "Could not read settings.json.",
        settingsPath,
      };
    }
    // ENOENT → no settings file yet; we will create a fresh one below.
  }

  let settings: Record<string, unknown> = {};
  if (raw != null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        status: "error",
        message:
          "settings.json is not valid JSON; refusing to edit it. Add the statusLine snippet manually.",
        settingsPath,
      };
    }
    const record = asRecord(parsed);
    if (!record) {
      return {
        status: "error",
        message:
          "settings.json is not a JSON object; refusing to edit it. Add the statusLine snippet manually.",
        settingsPath,
      };
    }
    settings = record;
    // Add-only: never overwrite an existing statusLine — even a present-but-falsy
    // one (`null`, `false`, `""`). Use a key-presence test, not truthiness.
    if ("statusLine" in settings) {
      const command = asRecord(settings.statusLine)?.command;
      const pointsAtScript =
        typeof command === "string" && command.includes(scriptPath);
      return { status: "already", settingsPath, pointsAtScript };
    }
  }

  // Back up an existing file before writing (a fresh file has nothing to back up).
  let backupPath = "";
  if (raw != null) {
    backupPath = `${settingsPath}.bak`;
    try {
      await copyFile(settingsPath, backupPath);
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      return {
        status: "error",
        message: `Could not back up settings.json: ${e.message}`,
        settingsPath,
      };
    }
  }

  settings.statusLine = statusLineConfig(scriptPath);

  try {
    await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, {
      mode: 0o600,
    });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return {
      status: "error",
      message: `Could not write settings.json: ${e.message}`,
      settingsPath,
    };
  }

  return { status: "wired", backupPath, settingsPath };
}
