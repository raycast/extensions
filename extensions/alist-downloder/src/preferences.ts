import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  username: string;
  password: string;
  host: string;
  downloadCommand: string;
}

export const preferences = getPreferenceValues<Preferences>();
export const HOST = preferences.host;
export const AUTH_URL = `${HOST}/api/auth/login`;
export const API_BASE_URL = `${HOST}/api/fs`;
export const CMD = preferences.downloadCommand;
