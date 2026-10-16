import { getPreferenceValues } from "@raycast/api";

type Preferences = {
    binary: string;
};

export function getPreferences() {
    return getPreferenceValues<Preferences>();
}
