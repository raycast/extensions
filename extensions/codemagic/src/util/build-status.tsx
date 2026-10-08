import { Color } from "@raycast/api";

export const statusToColor: { [status: string]: Color } = {
  building: Color.Blue,
  canceled: Color.Red,
  finishing: Color.Green,
  finished: Color.Green,
  failed: Color.Red,
  fetching: Color.Yellow,
  preparing: Color.Orange,
  publishing: Color.Purple,
  queued: Color.Magenta,
  skipped: Color.SecondaryText,
  testing: Color.Blue,
  timeout: Color.Red,
  warning: Color.Yellow,
};

export const getIconForBuildStatus = (status: string): string => {
  switch (status) {
    case "preparing":
      return "clock-16";
    case "fetching":
      return "cog-16";
    case "finishing":
      return "ellipsis-16";
    case "building":
      return "hammer-16";
    case "finished":
      return "check-circle-16";
    case "failed":
      return "x-mark-circle-16";
    case "canceled":
      return "minus-circle-16";
    case "queued":
      return "hourglass-16";
    case "testing":
      return "bug-16";
    case "skipped":
      return "arrow-clockwise-16";
    case "publishing":
      return "lorry-16";
    case "warning":
      return "important-01-16";
    case "timeout":
      return "clock-16";
    default:
      return "question-mark-circle-16";
  }
};
