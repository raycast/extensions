export interface Preferences {
  baseUrl: string;
  apiKey?: string;
  model?: string;
  responseView?: "rich" | "plain";
  askBackend?: "direct" | "hermes" | "openclaw";
  hermesUrl?: string;
  hermesKey?: string;
  openclawUrl?: string;
  openclawToken?: string;
}
