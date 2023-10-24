
import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
    authToken: string;
}

export function getPreferences(): Preferences {
    const authToken = getPreferenceValues().authToken as string;
    return { authToken };
}