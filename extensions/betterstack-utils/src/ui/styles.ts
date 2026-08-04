import { CSSProperties } from "react";

/**
 * Single-line text truncation with a trailing ellipsis.
 *
 * Satori's `tw` engine does not support the Tailwind `truncate` utility (nor
 * `text-ellipsis` / `whitespace-nowrap`), so truncation must be applied via an
 * inline `style`. The element also needs a definite width — set one through
 * `tw` (e.g. `w-full`) or an explicit `width` alongside this style.
 */
export const ellipsisStyle: CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
