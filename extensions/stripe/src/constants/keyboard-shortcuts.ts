import type { Keyboard } from "@raycast/api";

/**
 * Standard keyboard shortcuts used across the Stripe extension.
 * Centralizes shortcut definitions for consistency and easy modification.
 */

export const SHORTCUTS = {
  /**
   * Primary copy action - typically for copying IDs
   */
  COPY_PRIMARY: {
    modifiers: ["cmd"] as Keyboard.KeyModifier[],
    key: "c",
  },

  /**
   * Secondary copy action - typically for copying additional data
   */
  COPY_SECONDARY: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "c",
  },

  /**
   * Copy email address
   */
  COPY_EMAIL: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "e",
  },

  /**
   * Copy amount/financial data
   */
  COPY_AMOUNT: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "a",
  },

  /**
   * Copy ID (alternative)
   */
  COPY_ID: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "i",
  },

  /**
   * Copy customer ID
   */
  COPY_CUSTOMER_ID: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "u",
  },

  /**
   * Open in browser (typically Stripe Dashboard)
   */
  OPEN_BROWSER: {
    modifiers: ["cmd"] as Keyboard.KeyModifier[],
    key: "o",
  },

  /**
   * Open preferences
   */
  OPEN_PREFERENCES: {
    modifiers: ["cmd"] as Keyboard.KeyModifier[],
    key: ",",
  },

  /**
   * Delete/Cancel action
   */
  DELETE: {
    modifiers: ["cmd"] as Keyboard.KeyModifier[],
    key: "delete",
  },

  /**
   * Refund action
   */
  REFUND: {
    modifiers: ["cmd"] as Keyboard.KeyModifier[],
    key: "r",
  },

  /**
   * Switch environment
   */
  SWITCH_ENVIRONMENT: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "e",
  },

  /**
   * Switch profile
   */
  SWITCH_PROFILE: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "a",
  },
} as const;
