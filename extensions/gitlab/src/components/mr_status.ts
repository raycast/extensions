import { Color, Icon, Image, List } from "@raycast/api";
import { GitLabIcons } from "../icons";
import { MRState } from "./mr";

export function getMRStateListIcon(state: string): List.Item.Props["icon"] {
  if (state === "merged") {
    return {
      value: {
        source: GitLabIcons.merged,
        tintColor: Color.Purple,
        mask: Image.Mask.Circle,
      },
      tooltip: "Merged",
    };
  }
  if (state === "closed") {
    return {
      value: { source: GitLabIcons.mropen, tintColor: Color.Red, mask: Image.Mask.Circle },
      tooltip: "Closed",
    };
  }
  return {
    value: { source: GitLabIcons.mropen, tintColor: Color.Green, mask: Image.Mask.Circle },
    tooltip: "Open",
  };
}

export function mrStateFilterIcon(state: MRState, isActive: boolean): Image.ImageLike {
  if (isActive) {
    return Icon.Checkmark;
  }
  if (state === MRState.all) {
    return Icon.List;
  }
  if (state === MRState.merged) {
    return { source: GitLabIcons.merged, tintColor: Color.Purple, mask: Image.Mask.Circle };
  }
  if (state === MRState.closed) {
    return { source: GitLabIcons.mropen, tintColor: Color.Red, mask: Image.Mask.Circle };
  }
  if (state === MRState.opened) {
    return { source: GitLabIcons.mropen, tintColor: Color.Green, mask: Image.Mask.Circle };
  }
  return Icon.Filter;
}
