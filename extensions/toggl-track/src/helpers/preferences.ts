import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();
export const {
  togglApiToken,
  showClientsInForm,
  showProjectsInForm,
  showTasksInForm,
  showTagsInForm,
  timeEntriesLookbackNumber,
  timeEntriesLookbackUnit,
} = preferences;

interface Preferences {
  togglApiToken: string;
  showClientsInForm: boolean;
  showProjectsInForm: boolean;
  showTasksInForm: boolean;
  showTagsInForm: boolean;
  timeEntriesLookbackNumber: number;
  timeEntriesLookbackUnit: "day" | "week" | "month";
}
