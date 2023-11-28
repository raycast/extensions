import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export const prefersListView = preferences.viewType === "list";
