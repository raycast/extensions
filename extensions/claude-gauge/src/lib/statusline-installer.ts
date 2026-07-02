import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CACHE_FILENAME, resolveClaudeConfigDir } from "./statusline-cache";
import { wireStatusLine, type WireResult } from "./claude-settings";

/**
 * Non-destructively patches the user's existing Claude Code statusline script so
 * that it tees the `rate_limits` object from stdin into the Claude Gauge cache
 * file. The patch is wrapped in clearly-marked fences and is idempotent.
 *
 * IMPORTANT: nothing here runs automatically — `session.tsx` only calls these
 * from an explicit user Action.
 */

export const BEGIN_MARKER = "# >>> claude-gauge capture (safe to remove) >>>";
export const END_MARKER = "# <<< claude-gauge capture <<<";

/** Path to the user's statusline script. */
export function statuslineScriptPath(): string {
  return join(resolveClaudeConfigDir(), "statusline-command.sh");
}

/** Path to the cache file the capture block writes to. */
export function cachePathForCapture(): string {
  return join(resolveClaudeConfigDir(), CACHE_FILENAME);
}

/**
 * Build the capture block. `cachePath` is embedded as a double-quoted shell
 * string; we escape `"`, `\`, and `$` so the path is treated literally.
 *
 * `stdinVar` is the shell variable the host script binds stdin to (the default
 * `input` matches `input=$(cat)`). When injecting into an existing script that
 * uses a different name (e.g. `json=$(cat)`), pass that name so the block reads
 * the right variable instead of an unset `$input`.
 */
export function buildCaptureBlock(
  cachePath: string,
  stdinVar = "input",
): string {
  const escaped = cachePath.replace(/(["\\$`])/g, "\\$1");
  return [
    BEGIN_MARKER,
    "# Tees Claude Code rate_limits into the Claude Gauge cache. Remove this",
    "# whole block (including both markers) to uninstall. Requires `jq`.",
    `__cg_cache="${escaped}"`,
    `if command -v jq >/dev/null 2>&1 && [ -n "$${stdinVar}" ]; then`,
    `  printf %s "$${stdinVar}" | jq -c '{rate_limits: .rate_limits, captured_at: now}' > "\${__cg_cache}.tmp" 2>/dev/null \\`,
    '    && mv "${__cg_cache}.tmp" "${__cg_cache}" 2>/dev/null || rm -f "${__cg_cache}.tmp" 2>/dev/null',
    "fi",
    "unset __cg_cache",
    END_MARKER,
  ].join("\n");
}

/** The standalone snippet shown to the user for manual installation. */
export function manualSnippet(): string {
  return buildCaptureBlock(cachePathForCapture());
}

/**
 * A minimal, self-contained statusline script for users who don't have one yet.
 * Reads Claude Code's JSON on stdin, tees `rate_limits` into the cache (via the
 * shared capture block), and prints a simple one-line status so the user still
 * gets a usable status line. Requires `jq`, like the capture block itself.
 */
export function buildMinimalScript(cachePath: string): string {
  return [
    "#!/bin/sh",
    "# Claude Code statusline — created by Claude Gauge.",
    "# Receives JSON on stdin, prints a single status line. Requires `jq`.",
    "",
    "input=$(cat)",
    "",
    buildCaptureBlock(cachePath),
    "",
    "cwd=$(printf %s \"$input\" | jq -r '.cwd // .workspace.current_dir // empty')",
    "model=$(printf %s \"$input\" | jq -r '.model.display_name // empty')",
    "",
    'if [ -n "$cwd" ]; then',
    '  case "$cwd" in',
    '    "$HOME"*) cwd="~${cwd#$HOME}" ;;',
    "  esac",
    "fi",
    "",
    "printf '%s' \"${cwd:-~}\"",
    'if [ -n "$model" ]; then printf \'  %s\' "$model"; fi',
    "printf '\\n'",
  ].join("\n");
}

export type InstallResult =
  | {
      status: "installed" | "created" | "already-installed";
      backupPath: string;
      scriptPath: string;
      settings: WireResult;
    }
  | { status: "error"; message: string; scriptPath: string };

function alreadyInstalled(contents: string): boolean {
  return contents.includes(BEGIN_MARKER) && contents.includes(END_MARKER);
}

/**
 * Insert the capture block immediately after the line that reads stdin
 * (`input=$(cat)`). The block is built to read whatever variable that line
 * binds stdin to, so scripts that use a non-`input` name (e.g. `json=$(cat)`)
 * still capture correctly. Falls back to appending the block at the end of the
 * script if no such line is found, so the install still succeeds for custom
 * scripts.
 */
function insertBlock(contents: string, cachePath: string): string {
  const lines = contents.split("\n");
  // Match assignments like: input=$(cat), INPUT=$( cat ), json=$(cat).
  const stdinRegex = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\$\(\s*cat\s*\)/;
  let idx = -1;
  let stdinVar = "input";
  for (let i = 0; i < lines.length; i++) {
    const match = stdinRegex.exec(lines[i]);
    if (match) {
      idx = i;
      stdinVar = match[1];
      break;
    }
  }

  const block = buildCaptureBlock(cachePath, stdinVar);
  if (idx === -1) {
    const sep = contents.endsWith("\n") ? "" : "\n";
    return `${contents}${sep}\n${block}\n`;
  }

  lines.splice(idx + 1, 0, "", block);
  return lines.join("\n");
}

/**
 * Install the capture block end-to-end so the Session view can never dead-end:
 *
 *  - No script yet → create a minimal one (with the capture block) and wire it
 *    into settings.json (add-only).
 *  - Script exists, block already present → no-op.
 *  - Script exists, no block → inject the block after a `.bak` backup, then
 *    ensure settings.json points at it (add-only).
 *
 * Settings wiring is add-only and always backed up; an existing `statusLine` is
 * left untouched. Never throws.
 */
export async function installStatuslineCapture(): Promise<InstallResult> {
  const scriptPath = statuslineScriptPath();
  const cachePath = cachePathForCapture();

  let contents: string | null = null;
  try {
    contents = await readFile(scriptPath, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== "ENOENT") {
      return {
        status: "error",
        message: e.message || "Could not read the statusline script.",
        scriptPath,
      };
    }
    // ENOENT → fall through to create a fresh minimal script.
  }

  // Case 1: no script yet → create a minimal one carrying the capture block.
  if (contents == null) {
    try {
      await writeFile(scriptPath, buildMinimalScript(cachePath), {
        mode: 0o755,
      });
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      return {
        status: "error",
        message: `Could not create the statusline script: ${e.message}`,
        scriptPath,
      };
    }
    const settings = await wireStatusLine(scriptPath);
    return { status: "created", backupPath: "", scriptPath, settings };
  }

  // Case 2: script exists and already carries our block. Still (re)check the
  // settings wiring so a partially-set-up install (block present but settings
  // never wired) can self-heal idempotently on a second run.
  if (alreadyInstalled(contents)) {
    const settings = await wireStatusLine(scriptPath);
    return {
      status: "already-installed",
      backupPath: "",
      scriptPath,
      settings,
    };
  }

  // Case 3: script exists → inject the block after a backup.
  const backupPath = `${scriptPath}.bak`;
  try {
    await copyFile(scriptPath, backupPath);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return {
      status: "error",
      message: `Could not create backup: ${e.message}`,
      scriptPath,
    };
  }

  const updated = insertBlock(contents, cachePath);
  try {
    await writeFile(scriptPath, updated, { mode: 0o755 });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return {
      status: "error",
      message: `Could not write the statusline script: ${e.message}`,
      scriptPath,
    };
  }

  const settings = await wireStatusLine(scriptPath);
  return { status: "installed", backupPath, scriptPath, settings };
}

export type UninstallResult =
  | { status: "removed"; scriptPath: string }
  | { status: "not-installed"; scriptPath: string }
  | { status: "error"; message: string; scriptPath: string };

/** Remove the capture block (including both markers) if present. */
export async function uninstallStatuslineCapture(): Promise<UninstallResult> {
  const scriptPath = statuslineScriptPath();

  let contents: string;
  try {
    contents = await readFile(scriptPath, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return {
      status: "error",
      message: e.message || "Could not read the statusline script.",
      scriptPath,
    };
  }

  if (!alreadyInstalled(contents)) {
    return { status: "not-installed", scriptPath };
  }

  const lines = contents.split("\n");
  const begin = lines.findIndex((l) => l.includes(BEGIN_MARKER));
  const end = lines.findIndex((l) => l.includes(END_MARKER));
  if (begin === -1 || end === -1 || end < begin) {
    return { status: "not-installed", scriptPath };
  }

  // Also swallow a single blank separator line we inserted before the block.
  let from = begin;
  if (from > 0 && lines[from - 1].trim() === "") from -= 1;
  lines.splice(from, end - from + 1);

  try {
    await writeFile(scriptPath, lines.join("\n"), { mode: 0o755 });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return {
      status: "error",
      message: `Could not write the statusline script: ${e.message}`,
      scriptPath,
    };
  }

  return { status: "removed", scriptPath };
}
