/**
 * Category icons for the dropdown, matching centralicons.com.
 *
 * The site's category glyphs are editorial choices, not derivable from the icon
 * data — an earlier "use the first icon in the category" heuristic produced
 * visibly wrong results (Accessibility got an arrow, Building got nothing), and
 * reverse-matching path data was worse, because several are drawn at a stroke
 * weight this extension doesn't bundle. So the markup is copied verbatim from
 * the site by `scripts/extract-category-icons.mjs`.
 */

import { Color, Icon, type Image } from "@raycast/api";
import { CATEGORY_ICONS } from "./category-icons";
import { svgToDataUri } from "./svg";

/** The dropdown icon for a category, falling back for unknown names. */
export function categoryIcon(category: string): Image.ImageLike {
  const svg = CATEGORY_ICONS[category];
  if (!svg) return Icon.Circle;
  return { source: svgToDataUri(svg), tintColor: Color.PrimaryText };
}
