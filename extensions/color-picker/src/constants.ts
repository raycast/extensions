/**
 * Application constants for the Color Palette Storage extension.
 *
 * This file contains shared constant values used throughout the application
 * for form initialization, default states, and configuration values.
 */

import { PaletteFormFields } from "./types";

/** Default name value. */
export const DEFAULT_NAME = "";

/** Default description value. */
export const DEFAULT_DESCRIPTION = "";

/** Default display mode. */
export const DEFAULT_MODE = "light";

/** Default keywords array. */
export const DEFAULT_KEYWORDS: string[] = [];

/** Default color value. */
export const DEFAULT_COLOR = "";

/** Maximum length of name form field. */
export const NAME_FIELD_MAXLENGTH = 30;

/** Maximum length of description form field. */
export const DESCRIPTION_FIELD_MAXLENGTH = 200;

/** Default form values. */
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
