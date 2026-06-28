import type { Color, Icon } from "@raycast/api";

/**
 * Common component prop types used across the Stripe extension.
 * These types provide consistent interfaces for reusable components.
 */

/**
 * Icon with associated color.
 * Used for status indicators and visual feedback.
 */
export type IconWithColor = {
  icon: Icon;
  color: Color;
};

/**
 * Common props for list item action components.
 */
export type ListItemActionsProps = {
  dashboardUrl: string;
};

/**
 * Props for rendering metadata sections in detail views.
 */
export type MetadataProps = {
  metadata?: Record<string, string | null>;
};

/**
 * Generic list item data structure that wraps a Stripe object with UI context.
 */
export type StripeListItemData<T> = {
  item: T;
  dashboardUrl: string;
};
