import { getPreferenceValues } from '@raycast/api';

interface RawPreferences {
    apiBaseUrl?: string;
    apiKey?: string;
}

export interface Preferences {
    apiBaseUrl: string;
    apiKey: string | null;
}

export function preferences(): Preferences {
    const raw = getPreferenceValues<RawPreferences>();
    const trimmedBase = raw.apiBaseUrl?.trim();
    const trimmedKey = raw.apiKey?.trim();
    return {
        apiBaseUrl: (trimmedBase && trimmedBase.length > 0
            ? trimmedBase
            : 'https://api.saasflow.com'
        ).replace(/\/$/, ''),
        apiKey: trimmedKey && trimmedKey.length > 0 ? trimmedKey : null,
    };
}
