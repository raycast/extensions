import type { Event } from "./types";
import { Cache } from "@raycast/api";
import { execSync } from "child_process";
import { formatDate } from "./utils";

const cache = new Cache();

// Command to be run in order to fetch the MacOS System Logs corresponding to Raycast Focus' Events.
//
// - The `--predicate` flag is used to filter the logs based on Raycast's subsystem
// (com.raycast.macos) and the Raycast Focus category (focus).
// - The `--info` flag is used to include only messages with the `info` level.
const COMMAND = `log show --predicate 'subsystem == "com.raycast.macos" AND category == "focus"' --info`;

/*
 * Function responsible for reading messages from MacOS' system logs belonging to Raycast Focus and
 * creating an array of events from these messages.
 *
 * It doesn't care about every single possible message logged by Raycast Focus, looking only for the
 * following messages:
 *
 * - Start Focus Session – Emitted at the start of a Raycast Focus Session.
 *
 * ```
 * 2025-05-06 18:07:45.438839-0700 0x2013     Info        0x0                  861    0    Raycast: [com.raycast.macos:focus] Start focus session
 *  Goal: Open Source
 *  Duration: 1500
 * ```
 *
 * - Focus Session Summary – Emitted after a session has been completed, contains the duration of
 *   the session.
 *
 * ```
 * 2025-05-06 18:07:56.407148-0700 0xaf73     Info        0x0                  861    0    Raycast: [com.raycast.macos:focus] Focus session activity summary
 * 	Start date: 2025-05-07 01:07:45 +0000
 * 	Source: command
 * 	Duration:
 * 	Pauses Count: 1
 * 	Block Events Count: 0
 * 	Snooze Events Count: 0
 * ```
 */
export function getEvents(): Event[] {
  // Figure out when was the last time that the events were fetched, so we can start fetching only
  // from that point onwards.
  let refreshedAt = cache.get("refreshedAt");

  // If there's no previous timestamp for when the events were fetched, we'll try to fetch the
  // events for the last 24 hours.
  if (refreshedAt === undefined) {
    const date = new Date();
    date.setHours(date.getHours() - 24);
    refreshedAt = formatDate(date);
  }

  // Add the `--start` flag to the `log` command to ensure only log messages starting from the
  // provided date and time are provided.
  const command = `${COMMAND} --start '${refreshedAt}'`;
  const lines = execSync(command, { timeout: 10000 }).toString().split("\n");
  const events: Event[] = [];

  // Build list of events from the command output.
  let start = new Date();
  let goal = "";
  let inSummary = false;

  for (const line of lines) {
    if (line.includes("Start focus session")) {
      const [dateString, timeString] = line.split(" ").slice(0, 2);
      start = new Date(`${dateString} ${timeString}`);
    } else if (line.includes("Goal: ")) {
      goal = line.replace(/.*Goal: /, "");
      events.push({ type: "start", start, goal });
    } else if (line.includes("Focus session activity summary")) {
      inSummary = true;
    } else if (inSummary && line.includes("Duration")) {
      const durationString = line.replace(/.*Duration: /, "");
      const duration = parseInt(durationString) || 0;
      events.push({ type: "summary", duration });
      inSummary = false;
    }
  }

  // Store current timestamp just before the command is run so we can keep track of when we want to
  // continue searching logs from the next time the command is run. This value is only set after the
  // events have been parsed to ensure that, if the parsing times out or fails, we continue
  // searching from the previous timestamp.
  const timestamp = new Date();
  cache.set("refreshedAt", formatDate(timestamp));

  return events;
}
