import { homedir } from "os";
import path from "path";

export const CLAUDE_DIR = path.join(homedir(), ".claude");
export const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");
export const HISTORY_FILE = path.join(CLAUDE_DIR, "history.jsonl");

/** Max lines to scan for session summary (first prompt, branch, etc.) */
export const SUMMARY_SCAN_LINES = 50;

/** Max exchanges to show in detail panel preview */
export const DETAIL_PREVIEW_EXCHANGES = 4;

/** Max exchanges to parse for full session view */
export const FULL_SESSION_EXCHANGES = 100;

/** Max results for history search */
export const HISTORY_SEARCH_LIMIT = 50;

/** LocalStorage key for favourites */
export const FAVOURITES_KEY = "claude-sessions-favourites";
