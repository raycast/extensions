export interface SonarrPreferences {
  host: string;
  port: string;
  base: string;
  http: "http" | "https";
  apiKey: string;
  futureDays: string;
}
