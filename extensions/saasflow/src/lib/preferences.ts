import { getPreferenceValues } from "@raycast/api";

export interface ResolvedPreferences {
    apiBaseUrl: string;
    apiKey: string | null;
}

export function preferences(): ResolvedPreferences {
    const raw = getPreferenceValues<Preferences>();
    const trimmedBase = raw.apiBaseUrl?.trim();
    const trimmedKey = raw.apiKey?.trim();
    return {
        apiBaseUrl: (trimmedBase && trimmedBase.length > 0 ? trimmedBase : "https://api.saasflow.com").replace(
            /\/$/,
            "",
        ),
        apiKey: trimmedKey && trimmedKey.length > 0 ? trimmedKey : null,
    };
}
