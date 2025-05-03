export interface UniversalInboxPreferences {
  apiKey: string;
  universalInboxBaseUrl: string;
}

export interface Page<T> {
  page: number;
  per_page: number;
  total: number;
  content: Array<T>;
}
