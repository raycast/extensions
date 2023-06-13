import { getPreferenceValues } from "@raycast/api";

import { Preferences } from "./types";

export const preferences = Object.freeze<Preferences>(getPreferenceValues());
