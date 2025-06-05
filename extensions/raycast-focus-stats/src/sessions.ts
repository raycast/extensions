import { Cache } from "@raycast/api";
import type { PendingSession, Session } from "./types";
import { getDatabase } from "./lib/db";
import { sessionsTable } from "./lib/schema";
import { and, gte, lte } from "drizzle-orm";

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

  const { start, goal } = JSON.parse(currentSessionString);
  return { start: new Date(start), goal };
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
 *
 * @param {Session} session - The session object to be saved
 * @returns {void}
 */
export async function saveSession(session: Session): Promise<void> {
  await getDatabase().insert(sessionsTable).values({
    goal: session.goal,
    duration: session.duration,
    timestamp: session.start.getTime(),
  });
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

  return rows.map((row: { goal: string; duration: number; timestamp: number }) => ({
    goal: row.goal,
    duration: row.duration,
    start: new Date(row.timestamp),
  }));
}
