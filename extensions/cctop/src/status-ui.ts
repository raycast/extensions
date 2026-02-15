import { Color, Icon, Image } from "@raycast/api";

import { needsAttention } from "./sessions";
import { SessionStatus } from "./types";

/** Map session status to Raycast Color, matching SessionStatus+UI.swift */
export function statusColor(status: SessionStatus): Color {
  switch (status) {
    case "waiting_permission":
      return Color.Red;
    case "waiting_input":
    case "needs_attention":
      return Color.Orange;
    case "working":
      return Color.Green;
    case "compacting":
      return Color.Purple;
    case "idle":
      return Color.SecondaryText;
  }
}

/** Map session status to display label, matching SessionStatus+UI.swift */
export function statusLabel(status: SessionStatus): string {
  switch (status) {
    case "waiting_permission":
      return "PERMISSION";
    case "waiting_input":
    case "needs_attention":
      return "WAITING";
    case "working":
      return "WORKING";
    case "compacting":
      return "COMPACTING";
    case "idle":
      return "IDLE";
  }
}

/** Full status description for the detail pane */
export function statusDescription(status: SessionStatus): string {
  switch (status) {
    case "waiting_permission":
      return "Waiting for Permission";
    case "waiting_input":
      return "Waiting for Input";
    case "needs_attention":
      return "Needs Attention";
    case "working":
      return "Working";
    case "compacting":
      return "Compacting Context";
    case "idle":
      return "Idle";
  }
}

/** Map session status to icon shape based on urgency */
export function statusIcon(status: SessionStatus): Image.ImageLike {
  if (needsAttention(status))
    return { source: Icon.ExclamationMark, tintColor: statusColor(status) };
  if (status === "idle")
    return { source: Icon.Circle, tintColor: statusColor(status) };
  return { source: Icon.CircleFilled, tintColor: statusColor(status) };
}
