import { Icon, Color } from "@raycast/api";
import { Session } from "./sesh";

export function getIcon(session: Session) {
  if (session.Icon) {
    return session.Icon;
  }
  switch (session.Src) {
    case "tmux":
      return {
        source: Icon.Bolt,
        tintColor: session.Attached >= 1 ? Color.Green : Color.Blue,
        tooltip: session.Attached >= 1 ? "Attached" : "Detached",
      };
    case "tmuxinator":
      return {
        source: Icon.Box,
        tintColor: Color.Magenta,
      };
    case "config":
      return {
        source: Icon.Cog,
        tintColor: Color.SecondaryText,
      };
    case "zoxide":
    default:
      return {
        source: Icon.Folder,
        tintColor: Color.SecondaryText,
      };
  }
}
