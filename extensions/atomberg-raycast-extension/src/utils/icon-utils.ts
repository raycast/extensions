import { Icon } from "@raycast/api";

/**
 * Mapping of icon string identifiers to Raycast Icon components
 *
 * Provides a centralized mapping for converting string-based icon names
 * to actual Raycast Icon components used throughout the application.
 */
export const iconMap: Record<string, Icon> = {
  power: Icon.Power,
  plus: Icon.Plus,
  minus: Icon.Minus,
  gauge: Icon.Gauge,
  repeat: Icon.Repeat,
  moon: Icon.Moon,
  lightbulb: Icon.LightBulb,
  clock: Icon.Clock,
  timer: Icon.Clock,
  xmarkcircle: Icon.XMarkCircle,
  sun: Icon.Sun,
  palette: Icon.Circle,
};

/**
 * Retrieves the appropriate Raycast Icon component from a string identifier
 *
 * @param iconString - String identifier for the icon
 * @returns Raycast Icon component, defaults to Icon.Dot if not found
 */
export const getIconFromString = (iconString: string): Icon => {
  return iconMap[iconString] || Icon.Dot;
};
