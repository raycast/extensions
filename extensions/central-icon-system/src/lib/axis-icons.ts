/**
 * Per-value icons for the style-axis submenus, lifted from centralicons.com.
 *
 * Captured from the live site's Style / Stroke / Corner controls via Chrome
 * DevTools. Each value has its *own* glyph — the stroke circles differ by
 * `stroke-width`, and the corner brackets are drawn at their actual radius — so
 * a single icon per submenu (the earlier mistake) throws away the information
 * these are carrying.
 *
 * Note the site's Style control is a two-state toggle rather than a menu, so
 * `line` and `solid` are its two rendered states.
 */

import { Color, Icon, type Image } from "@raycast/api";
import type { Corner, Fill, Radius, ShowFilter, Stroke } from "../types";
import { svgToDataUri } from "./svg";

const LINE =
  '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="4.5" width="22" height="15" rx="7.5" stroke="currentColor"></rect><circle cx="8.5" cy="12" r="3" fill="currentColor"></circle></svg>';

const SOLID =
  '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M23.5 12C23.5 16.4183 19.9183 20 15.5 20H8.5C4.08172 20 0.5 16.4183 0.5 12C0.5 7.58172 4.08172 4 8.5 4H15.5C19.9183 4 23.5 7.58172 23.5 12ZM15.5 15C17.1569 15 18.5 13.6569 18.5 12C18.5 10.3431 17.1569 9 15.5 9C13.8431 9 12.5 10.3431 12.5 12C12.5 13.6569 13.8431 15 15.5 15Z" fill="currentColor"></path></svg>';

const STROKE_ICONS: Record<Stroke, string> = {
  "1": '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.5 12C21.5 17.2467 17.2467 21.5 12 21.5C6.75329 21.5 2.5 17.2467 2.5 12C2.5 6.75329 6.75329 2.5 12 2.5C17.2467 2.5 21.5 6.75329 21.5 12Z" stroke="currentColor" stroke-linejoin="round"></path></svg>',
  "1.5":
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"></path></svg>',
  "2": '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"></path></svg>',
};

const RADIUS_ICONS: Record<Radius, string> = {
  0: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.25 3.75H3.75V20.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
  1: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.25 3.75H10.15C7.90979 3.75 6.78969 3.75 5.93404 4.18597C5.18139 4.56947 4.56947 5.18139 4.18597 5.93404C3.75 6.78969 3.75 7.90979 3.75 10.15V20.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
  2: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.25 3.75H13.35C9.98969 3.75 8.30953 3.75 7.02606 4.40396C5.89708 4.9792 4.9792 5.89708 4.40396 7.02606C3.75 8.30953 3.75 9.98969 3.75 13.35V20.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
  3: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.25 3.75H16.55C12.0696 3.75 9.82937 3.75 8.11808 4.62195C6.61278 5.38893 5.38893 6.61278 4.62195 8.11808C3.75 9.82937 3.75 12.0696 3.75 16.55V20.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
};

/**
 * The `0px sharp` bracket — a hard right angle with square caps.
 *
 * Distinct from `0px round`, which is the same geometry with rounded caps. That
 * pair is exactly the join axis, which is why corner and join are one control.
 */
const SHARP =
  '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 3.75H3.75V21" stroke="currentColor" stroke-width="1.5"></path></svg>';

function icon(svg: string): Image.ImageLike {
  return { source: svgToDataUri(svg), tintColor: Color.PrimaryText };
}

export function fillIcon(fill: Fill): Image.ImageLike {
  return icon(fill === "filled" ? SOLID : LINE);
}

/** The Show filter reuses the fill glyphs; "all" has no site equivalent. */
export function showIcon(show: ShowFilter): Image.ImageLike {
  if (show === "filled") return icon(SOLID);
  if (show === "outlined") return icon(LINE);
  return Icon.AppWindowGrid2x2;
}

export function strokeIcon(stroke: Stroke): Image.ImageLike {
  return icon(STROKE_ICONS[stroke]);
}

/**
 * The bracket for a corner option, matching the site's Corner menu.
 *
 * `square` only exists at radius 0, where it is the sharp-capped bracket;
 * every other option is a rounded bracket at its own radius.
 */
export function cornerIcon({ join, radius }: Corner): Image.ImageLike {
  return icon(join === "square" ? SHARP : RADIUS_ICONS[radius]);
}
