import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();
export const {
  togglApiToken,
  showClientsInForm,
  showProjectsInForm,
  showTasksInForm,
  showTagsInForm,
  timeEntriesLookbackDays,
} = preferences;

interface Preferences {
  togglApiToken: string;
  showClientsInForm: boolean;
  showProjectsInForm: boolean;
  showTasksInForm: boolean;
  showTagsInForm: boolean;
  timeEntriesLookbackDays: number;
}
