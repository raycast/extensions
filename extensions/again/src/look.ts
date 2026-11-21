import { Color, Icon, Image } from "@raycast/api";
import { Outcome } from "./logic";

// The green of the extension icon, lightened on dark backgrounds so it keeps its contrast.
export const GREEN: Color.Dynamic = { light: "#1f5c4d", dark: "#4fb89a", adjustContrast: true };
// The evening nudge is neutral: a warm color acts like a traffic light for someone who is already tense.
export const QUIET: Color.Dynamic = { light: "#6b6b6b", dark: "#a0a0a0", adjustContrast: true };

// Chosen and still open: the circle is filled with green. Nothing chosen: an empty gray circle.
export const OPEN_CIRCLE: Image.ImageLike = { source: Icon.CircleFilled, tintColor: GREEN };
export const PICK_CIRCLE: Image.ImageLike = { source: Icon.Circle, tintColor: Color.SecondaryText };
export const SELECTED_CIRCLE: Image.ImageLike = { source: Icon.CircleFilled, tintColor: GREEN };
// A different shape, not just a different color: it must read without color (WCAG 1.4.1).
export const NUDGE_CIRCLE: Image.ImageLike = { source: Icon.CircleEllipsis, tintColor: QUIET };

// Every state differs by shape or fill, so it reads without color: empty, filled, three dots, half, check, moon. "Not today" stays neutral: it is not a failure.
export function outcomeIcon(outcome: Outcome): Image.ImageLike {
  if (outcome === "done") return { source: Icon.CheckCircle, tintColor: GREEN };
  if (outcome === "some") return { source: Icon.CircleProgress50, tintColor: GREEN };
  return { source: Icon.Moon, tintColor: Color.SecondaryText };
}

export const EVENING_FROM = 18;
export const isEvening = (date: Date) => date.getHours() >= EVENING_FROM;
