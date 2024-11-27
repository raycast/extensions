import { getPreferenceValues } from "@raycast/api";

type DefaultOpen = "browser" | "pocket-website";

type Preferences = {
  defaultOpen: DefaultOpen;
};

export const preferences = getPreferenceValues<Preferences>();
