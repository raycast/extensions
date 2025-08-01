/**
 * Application constants for the Color Palette Storage extension.
 *
 * This file contains shared constant values used throughout the application
 * for form initialization, default states, and configuration values.
 */

import { PaletteFormFields } from "./types";

/**
 * Default form values for palette creation form initialization.
 *
 * Used when creating a new palette or resetting the form to its initial state.
 * Provides a clean starting point with one empty color field and empty metadata.
 *
 * @example
 * ```typescript
 * // Reset form to initial state
 * reset(CLEAR_FORM_VALUES);
 * ```
 */

export const DEFAULT_NAME = "";
export const DEFAULT_DESCRIPTION = "";
export const DEFAULT_MODE = "light";
export const DEFAULT_KEYWORDS: string[] = [];
export const DEFAULT_COLOR = "";

export const CLEAR_FORM_VALUES: PaletteFormFields = {
  /** Default empty name */
  name: DEFAULT_NAME,
  /** Default empty description */
  description: DEFAULT_DESCRIPTION,
  /** Default mode set to light */
  mode: DEFAULT_MODE,
  /** Default empty keywords array */
  keywords: DEFAULT_KEYWORDS,
  /** Default editing palette ID (undefined for new palettes) */
  editId: undefined,
  /** Default first color field (empty) */
  color1: DEFAULT_COLOR,
};
