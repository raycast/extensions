import { Color, Icon } from "@raycast/api";

export type SeverityMeta = {
  icon: Icon;
  tint: Color;
  label: string;
};

export function severityMeta(level: string): SeverityMeta {
  switch (level) {
    case "ERROR":
      return { icon: Icon.XMarkCircle, tint: Color.Red, label: "Error" };
    case "WARNING":
      return { icon: Icon.ExclamationMark, tint: Color.Yellow, label: "Warning" };
    case "INFO":
      return { icon: Icon.Info, tint: Color.Blue, label: "Info" };
    case "VERBOSE":
      return { icon: Icon.Dot, tint: Color.SecondaryText, label: "Verbose" };
    case "RAW":
      return { icon: Icon.Text, tint: Color.SecondaryText, label: "Raw" };
    default:
      return { icon: Icon.Circle, tint: Color.PrimaryText, label: level || "Unknown" };
  }
}
