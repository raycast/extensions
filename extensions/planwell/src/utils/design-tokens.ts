/**
 * PlanWell Design Tokens (Raycast Extension)
 *
 * Subset of the PlanWell design system tokens needed for this extension.
 * Source of truth: shared/design-system/tokens.ts
 *
 * Keep in sync with the main design system when colors change.
 */

// Base colors (Notion-inspired)
export const base = {
  text: {
    primary: "#37352f",
    secondary: "#787774",
  },
} as const;

// Accent (sky blue)
export const accent = {
  primary: "#0ea5e9",
} as const;

export const designTokens = {
  colors: {
    base,
    accent,
  },
} as const;
