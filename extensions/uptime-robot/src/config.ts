import { Color, getPreferenceValues, Icon, Image } from "@raycast/api";

export const API_URL = "https://api.uptimerobot.com/v2/";
const API_KEY = getPreferenceValues<Preferences>().main_api_key;
export const API_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
};
export const API_BODY = {
  api_key: API_KEY,
  format: "json",
};
export const DEFAULT_PAGE_LIMIT = 50;

export const MONITOR_TYPES: Record<string, { title: string; info: string }> = {
  "1": {
    title: "HTTP / website monitoring",
    info: "Use HTTP(S) monitor to monitor your website, API endpoint, or anything running on HTTP.",
  },
  // "2": { title: "Keyword monitoring", info: "Check the presence or absence of specific text in the request's response body (typically HTML or JSON)." },
  // "3": { title: "Ping monitoring", info: "Make sure your server or any device in the network is always available." },
  // "4": { title: "Port monitoring", info: "Monitor any service on your server. Useful for SMTP,  POP3, FTP, and other services running on specific TCP ports." },
  // "5": { title: "Cron job / Heartbeat monitoring", info: "You send requests to our servers and we check if they arrive on time.", paid: true },
};
export const MONITOR_INTERVALS = {
  300: "5 minutes",
  1800: "30 minutes",
  3600: "1 hour",
  43200: "12 hours",
  86400: "24 hours",
};
export const MONITOR = {
  TIMEOUTS: {
    1: "1 seconds",
    15: "15 seconds",
    30: "30 seconds",
    45: "45 seconds",
    60: "60 seconds",
  },
};
export const MONITOR_ICONS: Record<number, Image.ImageLike> = {
  0: { source: Icon.Pause, tintColor: Color.Yellow },
  1: Icon.Minus,
  2: { source: Icon.Play, tintColor: Color.Green },
  8: { source: Icon.ArrowDown, tintColor: Color.Orange },
  9: { source: Icon.Stop, tintColor: Color.Red },
};
