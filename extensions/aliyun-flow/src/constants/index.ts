import { Color, Icon, Image, getPreferenceValues } from "@raycast/api";
import { Status } from "../types";

export const DOMAIN = "https://openapi-rdc.aliyuncs.com";

export const { organization_id: ORGANIZATION_ID, yunxiao_token: YUNXIAO_TOKEN } =
  getPreferenceValues<ExtensionPreferences>();

export const STATUS_TO_COLOR_MAP: Record<Status, { color?: string; icon: Image.Source }> = {
  SUCCESS: {
    color: Color.Green,
    icon: Icon.Checkmark,
  },
  FAIL: { color: Color.Red, icon: Icon.Xmark },
  RUNNING: {
    icon: {
      light: "circle-process.gif",
      dark: "circle-process@dark.gif",
    },
  },
  CANCELED: { color: Color.SecondaryText, icon: Icon.CircleDisabled },
  WAITING: { color: Color.Blue, icon: Icon.Clock },
};

export const YUNXIAO_HEADERS = {
  "x-yunxiao-token": YUNXIAO_TOKEN,
};
