import { Cache } from "@raycast/api";
import type { PendingSession, Session, NewSession } from "./types";
import { getDatabase } from "./lib/db";
import { sessionsTable } from "./lib/schema";
import { and, gte, lte } from "drizzle-orm";
import { showToast, Toast } from "@raycast/api";
import { SqliteError } from "better-sqlite3-multiple-ciphers";

const cache = new Cache();

export function createSession(start: Date, goal: string): PendingSession {
  return { start, goal };
}

/**
 * Retrieves the current session from cache
 *
 * @returns {PendingSession | null} The current session or null if no current session exists
 */
export function getCurrentSession(): PendingSession | null {
  const currentSessionString = cache.get("currentSession");

  if (!currentSessionString) {
    return null;
  }

  try {
    const { start, goal } = JSON.parse(currentSessionString);
    return { start: new Date(start), goal };
  } catch {
    // If this code fails to parse the existing cached session, simply inform the user but ignore
    // the error, seeing as, as far as we know, there's no way to recover from it.
    showToast({ style: Toast.Style.Failure, title: "Failed to parse cached session. Discarding." });
    return null;
  }
}

/**
 * Saves the current session to cache
 *
 * @param {PendingSession} session - The session to save
 */
export function setCurrentSession(session: PendingSession): void {
  cache.set("currentSession", JSON.stringify(session));
}

/**
 * Removes the current session from cache, regardless of whether it exists or not.
 */
export function removeCurrentSession() {
  cache.remove("currentSession");
}

/**
 * Saves the provided session data to the database.
 * Checks for existing sessions with the same timestamp to prevent duplicates.
 *
 * @param {Session} session - The session object to be saved
 * @returns {void}
 */
export async function saveSession(session: NewSession): Promise<void> {
  const timestamp = session.start.getTime();

  try {
    await getDatabase().insert(sessionsTable).values({
      goal: session.goal,
      duration: session.duration,
      timestamp: timestamp,
    });
  } catch (error) {
    // The `goal` and `timestamp` columns have a composite unique constraint in order to prevent
    // duplicate sessions for the same goal and timestamp.
    // When such a session already exists, let's simply log a message as this was an issue that
    // could happen when running the "Sync Sessions" command multiple times at roughly the same
    // exact moment, leading to duplicates.
    if (error instanceof SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      console.log(`Session already exists for timestamp ${session.start.toISOString()}, skipping duplicate`);
    } else {
      console.error(`Failed to save session: ${error}`);
    }
  }
}

/**
 * Retrieves all sessions for a specific date.
 *
 * @param {Date} date - The date for which to retrieve sessions
 * @returns {Session[]} An array of Session objects for the specified date
 */
export function getSessionsByDate(date: Date): Session[] {
  // Build the dates for the start and end of the user's day, so we can then access the timestamp
  // date to build the file's names.
  const startOfDay = new Date(date);
  const endOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  endOfDay.setHours(23, 59, 59, 999);

  const database = getDatabase();
  const rows = database
    .select()
    .from(sessionsTable)
    .where(and(gte(sessionsTable.timestamp, startOfDay.getTime()), lte(sessionsTable.timestamp, endOfDay.getTime())))
    .orderBy(sessionsTable.timestamp)
    .all();

  return rows.map((row: { id: number; goal: string; duration: number; timestamp: number }) => ({
    id: row.id,
    goal: row.goal,
    duration: row.duration,
    start: new Date(row.timestamp),
  }));
}
