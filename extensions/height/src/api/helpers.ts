import { getPreferenceValues } from "@raycast/api";

export const ApiUrls = {
  activities: "https://api.height.app/activities",
  fieldTemplates: "https://api.height.app/fieldTemplates",
  groups: "https://api.height.app/groups",
  lists: "https://api.height.app/lists",
  securityLogEvents: "https://api.height.app/securityLogEvents",
  taskforms: "https://api.height.app/taskforms",
  tasks: "https://api.height.app/tasks",
  users: "https://api.height.app/users",
  me: "https://api.height.app/users/me",
  workspace: "https://api.height.app/workspace",
};

type Preferences = {
  token: string;
};

const { token } = getPreferenceValues<Preferences>();

export const ApiHeaders = {
  Authorization: `api-key ${token}`,
  "Content-Type": "application/json",
};
