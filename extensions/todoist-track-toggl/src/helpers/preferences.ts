import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();
export const togglApiToken = preferences.togglApiToken;
export const todoistApiToken = preferences.todoistApiToken;

interface Preferences {
  togglApiToken: string;
  todoistApiToken: string;
}
