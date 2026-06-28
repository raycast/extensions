import { Color, getPreferenceValues, Icon, Image } from "@raycast/api";
import { MonitorStatus } from "./types";

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

export const MONITOR_TYPES: Record<
  string,
  { title: string; info: string; url: { title: string; placeholder: string } }
> = {
  "1": {
    title: "HTTP / website monitoring",
    info: "Use HTTP(S) monitor to monitor your website, API endpoint, or anything running on HTTP.",
    url: {
      title: "URL to monitor",
      placeholder: "https://example.com or http://80.75.11.12",
    },
  },
  // "2": { title: "Keyword monitoring", info: "Check the presence or absence of specific text in the request's response body (typically HTML or JSON)." },
  "3": {
    title: "Ping monitoring",
    info: "Make sure your server or any device in the network is always available.",
    url: {
      title: "IP or host to monitor",
      placeholder: "80.75.11.12 or example.com",
    },
  },
  // "4": { title: "Port monitoring", info: "Monitor any service on your server. Useful for SMTP,  POP3, FTP, and other services running on specific TCP ports." },
  // "5": { title: "Cron job / Heartbeat monitoring", info: "You send requests to our servers and we check if they arrive on time.", paid: true },
};
export const MONITOR_INTERVALS: Record<number, string> = {
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
export const MONITOR_ICONS: Record<MonitorStatus, Image.ImageLike> = {
  0: { source: Icon.Pause, tintColor: Color.Yellow },
  1: { source: Icon.CircleFilled, tintColor: "#72839E" },
  2: { source: Icon.ArrowUpCircleFilled, tintColor: Color.Green },
  8: { source: Icon.ArrowDown, tintColor: Color.Orange },
  9: { source: Icon.ArrowDownCircleFilled, tintColor: Color.Red },
};
