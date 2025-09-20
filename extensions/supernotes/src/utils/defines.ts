import { environment } from "@raycast/api";

export enum Status {
  DISABLED = -2,
  HIDDEN = -1,
  NONE = 0,
  PENDING = 1,
  ACTIVE = 2,
}

export const SUPERNOTES_APP_CUSTOM_SCHEME = "supernotes:/";
export const SUPERNOTES_API_ROOT = environment.isDevelopment
  ? "http://127.0.0.1:5000"
  : "https://api.supernotes.app";
