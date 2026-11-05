import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { parseSession, parseSessions } from "./parsers";
import { dropPartialFirstLine } from "./text";
import type { Session, Win } from "./types";

const run = promisify(execFile);

// Raycast does not use the shell PATH, so look in the places Rex installs its CLI.
const BINARY_CANDIDATES = [
  `${homedir()}/Library/Application Support/com.superlogical.rex/RexServer/Versions/Current/Rex Server.app/Contents/MacOS/rex`,
  "/Applications/Rex.app/Contents/Helpers/Rex Server.rex/Contents/MacOS/rex",
  "/Applications/Rex Beta.app/Contents/Helpers/Rex Server.rex/Contents/MacOS/rex",
];

// `rex capture` prints the whole scrollback (up to ~64 MiB), so the default 1 MiB buffer is not enough.
const MAX_BUFFER = 128 * 1024 * 1024;

function rexBinary(): string {
  const configured = getPreferenceValues<Preferences>().rexPath?.trim();
  if (configured) return configured.replace(/^~(?=\/|$)/, homedir());
  const found = BINARY_CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error("Could not find the rex binary. Set “Rex CLI Path” in the extension preferences.");
  return found;
}

export async function rex(...args: string[]): Promise<string> {
  const { stdout } = await run(rexBinary(), args, { timeout: 15_000, maxBuffer: MAX_BUFFER });
  return stdout;
}

/** Like `rex`, but never starts the server just to look at it (used by background polling). */
export const rexQuiet = (...args: string[]) => rex("--autostart=false", ...args);

export const listSessions = async (quiet = false): Promise<Session[]> =>
  parseSessions(await (quiet ? rexQuiet : rex)("ls", "--json"));

export const inspectSession = async (id: string, quiet = false): Promise<{ active: string; windows: Win[] }> =>
  parseSession(await (quiet ? rexQuiet : rex)("session", "inspect", id, "--json"));

/** Calls a method that a block provides (process, program_status, title…) and parses its JSON result. */
export async function blockCall<T>(
  session: string,
  block: string,
  method: string,
  quiet = false,
  args?: Record<string, unknown>,
): Promise<T> {
  // `-s` is required: without it only blocks of the current session are found.
  const argv = ["block", "call", "-s", session, "-b", block, method];
  if (args) argv.push(JSON.stringify(args));
  return JSON.parse(await (quiet ? rexQuiet : rex)(...argv));
}

/** Runs a client action (pane.split.right, client.tab.new…) on the connected Rex app. */
export const doAction = (action: string, ...args: string[]) => rex("do", action, ...args);

/**
 * The end of a pane's screen plus scrollback, at most about `maxBytes`, never the whole history
 * (a busy pane can hold tens of MiB). Starts on a whole line.
 */
export async function captureTail(session: string, block: string, maxBytes = 24_576): Promise<string> {
  const first = await blockCall<{ content: string; id?: number; total?: number }>(session, block, "format", false, {
    trim: true,
    unwrap: true,
    max_bytes: maxBytes,
  });
  if (first.id === undefined) return first.content; // it all fit

  const start = Math.max(0, (first.total ?? 0) - maxBytes);
  let offset = start;
  let text = "";
  for (let i = 0; i < 8; i++) {
    const part = await blockCall<{ data: string; eof: boolean }>(session, block, "blob_read", false, {
      id: first.id,
      offset,
      max_bytes: maxBytes,
    });
    text += part.data;
    offset += Buffer.byteLength(part.data);
    if (part.eof || !part.data) break;
  }
  return start > 0 ? dropPartialFirstLine(text) : text;
}

/** Current screen plus scrollback of a terminal block (whole history: prefer `captureTail`). */
export const captureBlock = (session: string, block: string, quiet = false) =>
  (quiet ? rexQuiet : rex)("capture", "-s", session, "-b", block, "--trim", "--unwrap");

/** Types text into the session's focused pane; with `enter` it also runs it. */
export async function sendText(session: string, text: string, enter: boolean) {
  // `--` so text that starts with a dash is not read as a flag.
  await rex("send", "-s", session, "--", text);
  if (enter) await rex("send-key", "-s", session, "enter");
}

const REX_BUNDLE_ID = "com.superlogical.rex";

export async function openRex() {
  await run("open", ["-b", REX_BUNDLE_ID]);
}

/** Shows the session in the app and brings it to the front. */
export async function showSession(id: string) {
  await doAction("session.select", `session_id=${id}`);
  await openRex();
}
