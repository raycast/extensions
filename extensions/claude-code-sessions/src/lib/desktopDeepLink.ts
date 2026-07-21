import { execFile } from "child_process";
import { promisify } from "util";
import { DesktopSessionInfo } from "./desktopSessions";

// No `@raycast/api` import here (see `sessions.ts`'s `KeyValueCache` doc for
// why) — `open(1)` handles this identically to Raycast's own `open()`.
const execFileAsync = promisify(execFile);

/**
 * Findings from statically inspecting the installed app's `app.asar` with
 * `node -e 'fs.readFileSync(...)'` + string search (the deep link handler is
 * a minified `switch (url.host)` in the main process):
 *
 * - `claude://resume?session=<cli-uuid>` (host `"resume"`, `Ur.Resume`) calls
 *   `sessionManager.importCliSession(cliUuid)`. Its full body computes a
 *   *deterministic* desktop session id up front — `r = LOCAL_SESSION_PREFIX +
 *   cliUuid`, confirmed `LOCAL_SESSION_PREFIX === "local_"` — then: `if
 *   (this.sessions.get(r)) return (logger.info("already imported as "+r),
 *   this.unarchiveSession(r), r)`. So resume *is* idempotent, but only for
 *   the `local_<cliUuid>` id it creates itself. A session that already has a
 *   Desktop wrapper under some *other* local id (e.g. Desktop-native or
 *   Conductor-adjacent sessions — "Sojern" is `local_dce205a5` wrapping cli
 *   `e0979c89`) is invisible to that check, so clicking resume for it makes
 *   a second, untitled `local_e0979c89` wrapper every time. Confirmed live:
 *   this is exactly the recurring "General coding session" duplicate.
 *   The Resume case only ever reads `searchParams.get("session")` — no
 *   other params (e.g. a title) are read or honored.
 *
 * - `claude://code/<bridgeId>` (host `"code"`) can jump straight to an
 *   *existing* session by its cross-device bridge id — but it's gated
 *   behind a remote GrowthBook flag (`Ct("2143883161")`; the SDK loads from
 *   a dynamic chunk and fetches gates remotely — no local, user-editable
 *   override file found anywhere under `~/Library/Application Support/Claude`
 *   in this profile), and confirmed via `~/Library/Logs/Claude/main.log`:
 *   every click logs `"claudeURLHandler: code session deep link gated off"`.
 *   Dead on this install.
 *
 * - `claude://claude.ai/claude-code-desktop/<id>` (host `"claude.ai"`, path
 *   `Ur.ClaudeCodeDesktop = "claude-code-desktop"`) routes through a
 *   completely different, *ungated* function (`EQ`) that just does
 *   `webContents.loadURL("/claude-code-desktop/" + rest)` — no feature flag,
 *   no bridge-id lookup. `"/claude-code-desktop"` is grouped in the same
 *   array (`lJe = [Ys, ug, dU]`, where `Ys = "/epitaxy"` is the confirmed
 *   internal route base `getSessionRoute()` navigates to for a session) as
 *   the app's own recognized-equivalent route prefixes, suggesting
 *   `/claude-code-desktop/<localSessionId>` may resolve to the same session
 *   view as `/epitaxy/<localSessionId>` — genuinely promising, and unlike
 *   the gated route, nothing stops it from firing. BUT: `EQ()` never logs
 *   anything on success, and its only failure path (`ib()`) only fires on a
 *   real network-level `loadURL` rejection — an unrecognized in-app route
 *   would "succeed" (load with no error) while silently showing the wrong
 *   screen, which is indistinguishable from working correctly by reading
 *   `main.log`. It can't be verified read-only, and shouldn't be fired to
 *   test it live, so it's wired in only as an explicitly-labeled
 *   "(experimental)" secondary action the user can opt into — never the
 *   default/Enter action.
 *
 * Given all that, and per explicit user decision after living with the
 * duplicate-wrapper behavior: Enter now just brings Claude Desktop to the
 * foreground (`open -a Claude`) — deterministic, side-effect-free, exactly
 * like the Conductor action's own fallback. Importing (`claude://resume`) is
 * demoted to an explicit secondary action so it's still one click away when
 * actually wanted, never a surprise.
 */
export interface DesktopResumeAction {
  title: string;
  target: string;
}

/** Always resume-based — see the module doc for why this is a deliberate secondary action now. */
export function resolveDesktopResumeAction(
  cliSessionId: string,
  desktopInfo: DesktopSessionInfo | undefined,
): DesktopResumeAction {
  return {
    title: "Import into Claude Desktop",
    target: `claude://resume?session=${encodeURIComponent(desktopInfo?.cliSessionId || cliSessionId)}`,
  };
}

/** Just brings the Claude Desktop app forward — the new default/Enter action. Never a no-op. */
export async function focusClaudeDesktopApp(): Promise<void> {
  await execFileAsync("open", ["-a", "Claude"]);
}

/**
 * Unverified, ungated candidate route for opening an *existing* Desktop
 * session directly by its own local id (see module doc) — only offered when
 * we actually have one to plug in.
 */
export function experimentalOpenSessionTarget(
  desktopInfo: DesktopSessionInfo | undefined,
): string | undefined {
  if (!desktopInfo) return undefined;
  return `claude://claude.ai/claude-code-desktop/${encodeURIComponent(desktopInfo.localSessionId)}`;
}
