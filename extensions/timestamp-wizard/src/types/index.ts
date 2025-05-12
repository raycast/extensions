import { Icon } from "@raycast/api";

/**
 * List item type definition
 */
export interface TimeItem {
  id: string;
  icon: Icon;
  title: string;
  subtitle: string;
  accessory?: string;
  value: string;
}

/**
 * Time conversion result type
 */
export type ConversionResult = TimeItem[];
