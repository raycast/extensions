// This is the Preferences interface, which uses the Raycast API to get preference values.
// This is extremely simple and only exports one constant, `Preferences`.
// It is used to abstract away the details of the Raycast API, similar to what we did for the Storage API.
// It is also a small speedup, as we can avoid fetching the preferences multiple times.

import { getPreferenceValues } from "@raycast/api";

export const Preferences = getPreferenceValues();
