import { executeSQL } from "@raycast/utils";
import { readCodexDesktopSessions as readSessions, readCodexTitles as readTitles } from "../core/codex-desktop";
import { Session } from "../core/types";

/** Keep Raycast's database helper out of the standalone hook/collector bundle. */
export const readCodexDesktopSessions = () => readSessions({ query: executeSQL });
export const readCodexTitles = (sessions: Session[]) => readTitles(sessions, { query: executeSQL });
