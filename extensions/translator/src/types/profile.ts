export interface ApiProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  enableStreaming: boolean;
  customHeadersJson: string;
  enabled: boolean;
}

export interface ProfileStoreData {
  profiles: ApiProfile[];
  defaultProfileId: string | null;
}

export interface CommandPreferences {
  defaultTargetLanguage: string;
}
