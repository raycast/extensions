import { Color, Icon, Image } from "@raycast/api";
import { absoluteUrl } from "../api/client";
import type { List, Member, Priority, TemplateStatus } from "../api/types";

/**
 * Hule's color names, mapped onto Raycast's palette.
 *
 * Deliberately NOT the hex values from our tokens: Raycast's own colors adapt
 * to the theme the viewer runs, and a copied hex here would be a second, silent
 * source of truth for the design system that nothing in this repo keeps honest.
 * Twenty-two names collapse onto seven — near neighbours share a bucket, which
 * is what a 16-pixel dot can carry anyway.
 */
const COLORS: Record<string, Color> = {
  red: Color.Red,
  rose: Color.Red,
  orange: Color.Orange,
  amber: Color.Orange,
  brown: Color.Orange,
  yellow: Color.Yellow,
  lime: Color.Yellow,
  green: Color.Green,
  emerald: Color.Green,
  teal: Color.Green,
  mint: Color.Green,
  cyan: Color.Blue,
  sky: Color.Blue,
  blue: Color.Blue,
  indigo: Color.Blue,
  violet: Color.Purple,
  purple: Color.Purple,
  magenta: Color.Magenta,
  pink: Color.Magenta,
  gray: Color.SecondaryText,
  slate: Color.SecondaryText,
  white: Color.PrimaryText,
};

export function colorOf(name: string | null | undefined, fallback = Color.SecondaryText): Color {
  return (name && COLORS[name]) || fallback;
}

/**
 * A status renders as its group's shape in its own color.
 *
 * The app's icon set is Iconoir with ~1500 glyphs and lives in the kit; shipping
 * it into a Store extension is not on. The GROUP is what the icon communicates
 * anyway — not started, running, finished — so that is what is drawn, and the
 * status's own color carries the rest.
 */
export function statusIcon(status: TemplateStatus | undefined) {
  if (!status) return { source: Icon.Circle, tintColor: Color.SecondaryText };
  const source =
    status.group === "done" ? Icon.CheckCircle : status.group === "in_progress" ? Icon.CircleProgress50 : Icon.Circle;
  return { source, tintColor: colorOf(status.iconColor, status.group === "done" ? Color.Green : Color.SecondaryText) };
}

export function listIcon(list: List | undefined) {
  return { source: Icon.List, tintColor: colorOf(list?.iconColor) };
}

/**
 * A person shows their actual photo when they have one. The avatar route is
 * public on purpose — it is consumed by plain `<img>` tags, which send no
 * credentials — so the URL can go straight to Raycast. People who publish no
 * photo (or chose their letters) fall back to a person glyph in their own
 * avatar color.
 */
export function memberIcon(member: Member | undefined): Image.ImageLike {
  if (member?.avatarUrl) {
    return { source: absoluteUrl(member.avatarUrl), mask: Image.Mask.Circle };
  }
  return { source: Icon.Person, tintColor: colorOf(member?.avatarColor) };
}

const PRIORITY_COLOR: Record<Priority, Color> = {
  none: Color.SecondaryText,
  low: Color.SecondaryText,
  normal: Color.Blue,
  high: Color.Orange,
  urgent: Color.Red,
};

/**
 * The product's own priority glyphs, carried as assets.
 *
 * These four are the exception to "no icon set in the extension": priority is
 * the one field whose shape people read without looking, and it is four files,
 * not a set. Same Iconoir solid glyphs the app draws (see the web app's priority
 * definitions) — one path in `currentColor` with the arrow knocked out, so
 * Raycast's tint lands on the whole mark and the arrow stays legible.
 */
const PRIORITY_ASSET: Record<Priority, string> = {
  none: "minus.svg",
  low: "priority-down.svg",
  normal: "priority-medium.svg",
  high: "priority-high.svg",
  urgent: "priority-up.svg",
};

export function priorityIcon(priority: Priority): Image.ImageLike {
  return { source: PRIORITY_ASSET[priority], tintColor: PRIORITY_COLOR[priority] };
}

export const priorityColor = (priority: Priority) => PRIORITY_COLOR[priority];
