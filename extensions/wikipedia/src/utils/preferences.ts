import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export const openInBrowser = preferences.openIn === "browser";
export const prefersListView = preferences.viewType === "list";
