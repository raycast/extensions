import { Icon, getPreferenceValues } from "@raycast/api";
import { Status } from "../types";

export const DOMAIN = "https://openapi-rdc.aliyuncs.com";
export const ORGANIZATION_ID = getPreferenceValues().organization_id;

export const CODEUP_SECRET = getPreferenceValues().codeup_secret;

export const STATUS_TO_COLOR_MAP: Record<Status, { color: string; icon: Icon }> = {
  SUCCESS: { color: "#00ff00", icon: Icon.Checkmark },
  FAIL: { color: "#FF0000", icon: Icon.Xmark },
  RUNNING: { color: "#FFFF00", icon: Icon.CircleProgress25 },
  CANCELED: { color: "#666687", icon: Icon.CircleDisabled },
};

export const CODEUP_HEADERS = {
  "x-yunxiao-token": CODEUP_SECRET,
};
