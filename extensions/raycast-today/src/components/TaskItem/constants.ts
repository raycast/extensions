import { Icon } from "@raycast/api";
import { STATUS_GROUPS } from "@today/common/types";

export const ICONS = {
  [STATUS_GROUPS.Todo]: { source: Icon.Circle, tintColor: "#D7D8DB" },
  [STATUS_GROUPS.Progress]: { source: Icon.CircleProgress50, tintColor: "#EAC041" },
  [STATUS_GROUPS.Complete]: { source: Icon.CheckCircle, tintColor: "#5e6ad2" },
};
