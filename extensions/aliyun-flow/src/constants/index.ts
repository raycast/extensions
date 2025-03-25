import { Icon, Image, getPreferenceValues } from "@raycast/api";
import { Status } from "../types";

export const DOMAIN = "https://openapi-rdc.aliyuncs.com";
export const ORGANIZATION_ID = getPreferenceValues().organization_id;

export const YUNXIAO_TOKEN = getPreferenceValues().access_token;

export const STATUS_TO_COLOR_MAP: Record<Status, { color?: string; icon: Image.Source }> = {
  SUCCESS: {
    color: "#15AD31",
    icon: Icon.Checkmark,
  },
  FAIL: { color: "#E62412", icon: Icon.Xmark },
  RUNNING: {
    icon: {
      light: "circle-process.gif",
      dark: "circle-process@dark.gif",
    },
  },
  CANCELED: { color: "#666687", icon: Icon.CircleDisabled },
};

export type StatusFilter = "ALL" | Status;

export const YUNXIAO_HEADERS = {
  "x-yunxiao-token": YUNXIAO_TOKEN,
};
