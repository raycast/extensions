import { Color } from "@raycast/api";
import { SubmissionStatus } from "./types";

export const STATUS_COLOR: Record<SubmissionStatus, Color> = {
  "Under Review": Color.Blue,
  Reviewed: Color.Purple,
  Accepted: Color.Green,
  Rejected: Color.Red,
  Withdrawn: Color.SecondaryText,
  "Desk Rejected": Color.Orange,
};
