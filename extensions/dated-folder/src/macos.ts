import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// macOS: system default terminal
// ---------------------------------------------------------------------------

export const FALLBACK_TERMINAL_BUNDLE = "com.apple.Terminal";

const LS_PREFS = join(homedir(), "Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist");

/**
 * macOS has no "default terminal" setting in System Settings, but LaunchServices stores the
 * shell-role handler for `public.unix-executable`. That is exactly what terminal apps write when
 * they ask "make this your default terminal?" on first launch, so it is the value to follow.
 */
export async function defaultTerminalBundleId(): Promise<string> {
  if (!existsSync(LS_PREFS)) return FALLBACK_TERMINAL_BUNDLE;
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", ["-convert", "json", "-o", "-", LS_PREFS]);
    return currentShellHandler(JSON.parse(stdout).LSHandlers) ?? FALLBACK_TERMINAL_BUNDLE;
  } catch {
    return FALLBACK_TERMINAL_BUNDLE;
  }
}

/**
 * Picks the shell-role handler for `public.unix-executable` from the LSHandlers array. The file
 * can carry several records for the same content type (LaunchServices rewrites are not always
 * deduplicated), so the one with the newest `LSHandlerModificationDate` wins — that is the
 * terminal the user chose most recently, not merely the first record in the file.
 */
export function currentShellHandler(handlers: unknown): string | undefined {
  if (!Array.isArray(handlers)) return undefined;
  const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
  const shellHandlers = handlers.filter(
    (h): h is Record<string, unknown> =>
      isRecord(h) && h.LSHandlerContentType === "public.unix-executable" && typeof h.LSHandlerRoleShell === "string",
  );
  const modified = (h: Record<string, unknown>) =>
    typeof h.LSHandlerModificationDate === "number" ? h.LSHandlerModificationDate : 0;
  const newest = shellHandlers.sort((a, b) => modified(b) - modified(a))[0];
  return newest?.LSHandlerRoleShell as string | undefined;
}
