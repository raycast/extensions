import { get } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";

export function getMe() {
  return get<Me>("/me");
}

/** @see {@link https://developers.track.toggl.com/docs/api/me#response Toggl Api} */
export interface Me extends ToggleItem {
  api_token?: string;
  beginning_of_week: number;
  country_id: number | null;
  created_at: string;
  default_workspace_id: number;
  email: string;
  fullname: string;
  has_password: boolean;
  image_url: string;
  intercom_hash?: string;
  openid_email: string | null;
  openid_enabled: boolean;
  oauth_providers?: string[];
  timezone: string;
  updated_at: string;
}
