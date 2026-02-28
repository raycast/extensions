export interface Preferences {
  apiKey: string;
  apiUrl?: string;
}

export function getApiUrl(preferences: Preferences): string {
  return preferences.apiUrl || "https://api.tldv.io/v1";
}
