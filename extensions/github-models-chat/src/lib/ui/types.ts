export interface UiModelDetails {
  name: string;
  capabilities?: string[];
  meta?: Record<string, string | number | string[]>;
  summary?: string;
  url?: string;
}
