import { environment } from "@raycast/api";

export enum Status {
  DISABLED = -2,
  HIDDEN = -1,
  NONE = 0,
  PENDING = 1,
  ACTIVE = 2,
}

export enum Visibility {
  INVISIBLE = -1,
  VISIBLE = 0,
  PRIORITY = 1,
}

export const SUPERNOTES_APP_LINK_URL = "supernotes://";
export const SUPERNOTES_API_URL = environment.isDevelopment
  ? "http://127.0.0.1:5000/v1"
  : "https://api.supernotes.app/v1";
