import { ConductorWorkspaceInfo } from "./conductor";
import { DesktopSessionInfo } from "./desktopSessions";
import { isConductorCwd } from "./format";
import { SessionMeta } from "./sessions";

export type SessionStatus = "active" | "archived" | "other";

/**
 * Mirrors what Claude Desktop's own sidebar (and Conductor's) considers
 * "active" — found by comparing our output against a ground-truth dump of
 * the desktop's session-management API, plus a follow-up bug report that
 * Conductor sessions were invisible in Active mode:
 *
 * - `active`: EITHER the session's `cwd` maps to a Conductor workspace whose
 *   `state` column is "ready" (Conductor sessions have no desktop record at
 *   all normally, so without this check they always fell into `other` and
 *   were hidden from the default Active view — confirmed real bug), OR it
 *   has a desktop record (was imported/resumed into Claude Desktop), isn't
 *   archived, and isn't a scheduled-task session. Desktop's sidebar hides
 *   scheduled-task sessions (e.g. ~50 daily "Day planner" runs in a real
 *   profile, tagged `scheduledTaskId: "day-planner"`) from its active list
 *   even though the API itself reports them as not archived.
 * - `archived`: the desktop record's `isArchived` is true, OR the session's
 *   `cwd` maps to a Conductor workspace whose `state` column is "archived"
 *   (verified via `SELECT DISTINCT state FROM workspaces` on a real
 *   profile — only "archived"/"ready" occur, so every Conductor-cwd session
 *   resolves to either `active` or `archived`, never `other`).
 * - `other`: everything else — pure CLI sessions with no desktop record and
 *   no Conductor workspace at all (checked `~/.claude` for any per-session
 *   archived/active concept; none exists), and scheduled-task sessions that
 *   aren't archived.
 *
 * Deliberately no `@raycast/api` import in this module (see
 * `sessions.ts`'s `KeyValueCache` doc for why) so it can be shared by both
 * the UI and the standalone smoke script.
 */
export function computeSessionStatus(
  session: SessionMeta,
  desktopIndex: Record<string, DesktopSessionInfo>,
  conductorWorkspaces: Record<string, ConductorWorkspaceInfo>,
): SessionStatus {
  const desktopInfo = desktopIndex[session.sessionId];
  const conductorState = isConductorCwd(session.cwd)
    ? conductorWorkspaces[session.cwd]?.state
    : undefined;
  const archived =
    desktopInfo?.isArchived === true || conductorState === "archived";
  if (archived) return "archived";
  if (conductorState === "ready") return "active";
  if (desktopInfo && !desktopInfo.scheduledTaskId) return "active";
  return "other";
}
