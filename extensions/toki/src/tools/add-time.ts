import { Tool } from "@raycast/api";
import { getGroups, getActivities, createGroup, createActivity, createEntry } from "../db";

function parseDuration(duration: string): number {
  let seconds = 0;
  const hours = duration.match(/(\d+)\s*h/i);
  const minutes = duration.match(/(\d+)\s*m/i);
  if (hours) seconds += parseInt(hours[1]) * 3600;
  if (minutes) seconds += parseInt(minutes[1]) * 60;
  return seconds;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return "0m";
}

type Input = {
  /**
   * Group/project name
   */
  groupName: string;
  /**
   * Activity/task name
   */
  activityName: string;
  /**
   * Duration to add (e.g. "2h 30m", "1h", "45m")
   */
  duration: string;
  /**
   * Date for the entry in YYYY-MM-DD format. Defaults to today.
   */
  date?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const seconds = parseDuration(input.duration);
  const date = input.date || new Date().toISOString().split("T")[0];

  return {
    message: `Add ${formatDuration(seconds)} to "${input.activityName}" in "${input.groupName}"?`,
    info: [{ name: "Date", value: date }],
  };
};

/**
 * Add a manual time entry to an activity.
 */
export default async function tool(input: Input) {
  const seconds = parseDuration(input.duration);
  if (seconds === 0) {
    return { error: "Invalid duration. Use format like '2h 30m', '1h', or '45m'" };
  }

  const date = input.date || new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0].slice(0, 5);

  const groups = await getGroups();
  let group = groups.find((g) => g.title.toLowerCase() === input.groupName.toLowerCase() && g.status === "active");

  if (!group) {
    group = await createGroup(input.groupName);
  }

  const activities = await getActivities(group.uuid);
  let activity = activities.find(
    (a) => a.title.toLowerCase() === input.activityName.toLowerCase() && a.status === "active"
  );

  if (!activity) {
    activity = await createActivity(group.uuid, input.activityName);
  }

  await createEntry(group.uuid, activity.uuid, seconds, date, time);

  return {
    added: true,
    groupTitle: group.title,
    activityTitle: activity.title,
    duration: formatDuration(seconds),
    date,
  };
}
