import { Tool } from "@raycast/api";
import { getGroups, getActivities, createGroup, createActivity } from "../db";

type Input = {
  /**
   * Name of the group/project to create, or existing group for new activity
   */
  groupName: string;
  /**
   * Name of the activity/task to create. Omit to create just a group.
   */
  activityName?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.activityName) {
    return {
      message: `Create activity "${input.activityName}" in "${input.groupName}"?`,
    };
  }
  return {
    message: `Create group "${input.groupName}"?`,
  };
};

/**
 * Create a new group or activity. Provide groupName only to create a group, add activityName to create an activity.
 */
export default async function tool(input: Input) {
  const groups = await getGroups();
  let group = groups.find((g) => g.title.toLowerCase() === input.groupName.toLowerCase() && g.status === "active");

  // Creating just a group
  if (!input.activityName) {
    if (group) {
      return { error: `Group "${input.groupName}" already exists` };
    }
    const newGroup = await createGroup(input.groupName);
    return {
      created: "group",
      title: newGroup.title,
    };
  }

  // Creating an activity - create group first if needed
  if (!group) {
    group = await createGroup(input.groupName);
  }

  const activities = await getActivities(group.uuid);
  const existing = activities.find(
    (a) => a.title.toLowerCase() === input.activityName!.toLowerCase() && a.status === "active"
  );

  if (existing) {
    return { error: `Activity "${input.activityName}" already exists in "${group.title}"` };
  }

  const newActivity = await createActivity(group.uuid, input.activityName);
  return {
    created: "activity",
    groupTitle: group.title,
    activityTitle: newActivity.title,
  };
}
