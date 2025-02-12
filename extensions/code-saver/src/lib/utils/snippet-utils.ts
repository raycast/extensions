import { Icon } from "@raycast/api";
import { format } from "date-fns";
import { Label } from "../types/dto";

export function labelIcon(label: Label) {
  return {
    source: Icon.CircleFilled,
    tintColor: {
      light: label.colorHex,
      dark: label.colorHex,
      adjustContrast: true,
    },
  };
}

export function dateFormat(date: Date) {
  return format(date, "M/dd/yyyy, h:mm a");
}
