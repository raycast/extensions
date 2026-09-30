import { Color, Image } from "@raycast/api";

/**
 * Map trust status CSS class to exact HEX color matching web/RN.
 * Uses dynamic color format for Raycast theme support.
 */
export function mapTrustColor(cssClass?: string): Color.Dynamic | Color {
  switch (cssClass) {
    case "diamond_status_badge":
      return { light: "#cce0f9", dark: "#cce0f9", adjustContrast: false };
    case "premium_status_badge":
      return { light: "#e5d5f2", dark: "#e5d5f2", adjustContrast: false };
    case "gold_status_badge":
      return { light: "#fce6aa", dark: "#fce6aa", adjustContrast: false };
    case "new_status_badge":
      return { light: "#ccf5d7", dark: "#ccf5d7", adjustContrast: false };
    default:
      return Color.SecondaryText;
  }
}

/**
 * Trust status icon from bundled assets.
 */
export function trustStatusIcon(
  cssClass?: string,
): Image.ImageLike | undefined {
  switch (cssClass) {
    case "diamond_status_badge":
      return { source: "status/diamond.png" };
    case "premium_status_badge":
      return { source: "status/premium.png" };
    case "gold_status_badge":
      return { source: "status/gold.png" };
    case "new_status_badge":
      return { source: "status/new.png" };
    default:
      return undefined;
  }
}

/**
 * Trust level for sorting: higher = more trusted.
 * Matches RN app: Diamond(4) > Premium(3) > Gold(2) > New(1) > Default(0)
 */
export function trustStatusOrder(cssClass?: string): number {
  switch (cssClass) {
    case "diamond_status_badge":
      return 4;
    case "premium_status_badge":
      return 3;
    case "gold_status_badge":
      return 2;
    case "new_status_badge":
      return 1;
    default:
      return 0;
  }
}

/**
 * Friendly name for trust status.
 */
export function trustStatusName(cssClass?: string): string {
  switch (cssClass) {
    case "diamond_status_badge":
      return "Diamond";
    case "premium_status_badge":
      return "Premium";
    case "gold_status_badge":
      return "Gold";
    case "new_status_badge":
      return "New";
    default:
      return "";
  }
}
