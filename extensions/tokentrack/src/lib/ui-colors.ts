import { Color } from "@raycast/api";

/** Consistent accent colors for cost and date values across list UI (not charts). */
export const COST_COLOR = Color.Green;

/**
 * Date accent for list rows. List accessory `text.color` only accepts built-in
 * {@link Color} values — custom hex/Dynamic colors are ignored (render as grey).
 */
export const DATE_COLOR = Color.Orange;
