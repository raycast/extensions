import { Icon, Color } from "@raycast/api";

export interface StateIcon {
  source: Icon;
  tintColor: Color;
}

export const getStateIcon = (state: string, hasConflicts: boolean, isDraft: boolean): StateIcon => {
  if (isDraft) return { source: Icon.Pencil, tintColor: Color.Orange };
  if (hasConflicts) return { source: Icon.ExclamationMark, tintColor: Color.Red };

  switch (state) {
    case "opened":
      return { source: Icon.Circle, tintColor: Color.Green };
    case "merged":
      return { source: Icon.CheckCircle, tintColor: Color.Purple };
    case "closed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const getStateEmoji = (state: string): string => {
  switch (state) {
    case "opened":
      return "🟢 **OPENED**";
    case "merged":
      return "🟣 **MERGED**";
    case "closed":
      return "🔴 **CLOSED**";
    default:
      return "⚪ **UNKNOWN**";
  }
};
