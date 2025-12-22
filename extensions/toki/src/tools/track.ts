import { Tool } from "@raycast/api";
import {
  getGroups,
  getActivities,
  getTrackingStatus,
  startTracking,
  stopTracking,
  createGroup,
  createActivity,
} from "../db";

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
   * Group/project name to start tracking. Omit to stop current session.
   */
  groupName?: string;
  /**
   * Activity/task name to start tracking. Required if groupName is provided.
   */
  activityName?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.groupName) {
    const status = await getTrackingStatus();
    if (!status) {
      return { message: "No active tracking session to stop." };
    }
    const elapsed = Math.floor(Date.now() / 1000) - status.startTime;
    return {
      message: `Stop tracking "${status.activityTitle}" in "${status.groupTitle}"?`,
      info: [{ name: "Duration", value: formatDuration(elapsed) }],
    };
  }

  return {
    message: `Start tracking "${input.activityName}" in "${input.groupName}"?`,
  };
};

/**
 * Start or stop time tracking. Omit params to stop, provide groupName + activityName to start.
 */
export default async function tool(input: Input) {
  // Check if trying to start without full info
  const hasGroup = input.groupName && input.groupName.trim() !== "";
  const hasActivity = input.activityName && input.activityName.trim() !== "";

  // If partial info provided, ask for the rest
  if (hasGroup && !hasActivity) {
    return { error: "Please specify which task/activity to track", groupProvided: input.groupName };
  }
  if (hasActivity && !hasGroup) {
    return { error: "Please specify which project/client this task belongs to", activityProvided: input.activityName };
  }

  // Stop tracking (no params provided)
  if (!hasGroup && !hasActivity) {
    const status = await getTrackingStatus();
    if (!status) {
      return { error: "No active tracking session. To start tracking, specify both a project and a task." };
    }
    const result = await stopTracking();
    return {
      stopped: true,
      groupTitle: status.groupTitle,
      activityTitle: status.activityTitle,
      duration: formatDuration(result.duration),
    };
  }

  const groups = await getGroups();
  let group = groups.find((g) => g.title.toLowerCase() === input.groupName!.toLowerCase() && g.status === "active");

  // Create group if doesn't exist
  if (!group) {
    group = await createGroup(input.groupName!);
  }

  const activities = await getActivities(group.uuid);
  let activity = activities.find(
    (a) => a.title.toLowerCase() === input.activityName!.toLowerCase() && a.status === "active"
  );

  // Create activity if doesn't exist
  if (!activity) {
    activity = await createActivity(group.uuid, input.activityName!);
  }

  await startTracking(group.uuid, activity.uuid);

  return {
    started: true,
    groupTitle: group.title,
    activityTitle: activity.title,
  };
}
