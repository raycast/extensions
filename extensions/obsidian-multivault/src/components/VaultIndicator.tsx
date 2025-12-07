import { List, Color } from "@raycast/api";
import {
  EnhancedVault,
  getVaultDisplayName,
  getVaultAbbreviation,
} from "../utils/vault-config";
import { GlobalPreferences } from "../utils/preferences";

export type VaultIndicatorStyle = "badge" | "subtitle" | "both" | "none";

/**
 * Get vault indicator as accessory (badge)
 */
export function getVaultBadgeAccessory(
  vault: EnhancedVault
): List.Item.Accessory {
  const abbreviation = getVaultAbbreviation(vault);
  const color = vault.metadata.color || Color.SecondaryText;

  return {
    tag: {
      value: abbreviation,
      color: color,
    },
    tooltip: `Vault: ${getVaultDisplayName(vault)}`,
  };
}

/**
 * Get vault indicator as subtitle text
 */
export function getVaultSubtitle(vault: EnhancedVault): string {
  return getVaultDisplayName(vault);
}

/**
 * Get vault indicators based on preference style
 * Returns object with subtitle and accessories
 */
export function getVaultIndicators(
  vault: EnhancedVault,
  style: VaultIndicatorStyle,
  baseSubtitle?: string,
  baseAccessories?: List.Item.Accessory[]
): {
  subtitle?: string;
  accessories?: List.Item.Accessory[];
} {
  const accessories = [...(baseAccessories || [])];
  let subtitle = baseSubtitle;

  switch (style) {
    case "badge":
      accessories.unshift(getVaultBadgeAccessory(vault));
      break;

    case "subtitle":
      subtitle = subtitle
        ? `${getVaultSubtitle(vault)} • ${subtitle}`
        : getVaultSubtitle(vault);
      break;

    case "both":
      accessories.unshift(getVaultBadgeAccessory(vault));
      subtitle = subtitle
        ? `${getVaultSubtitle(vault)} • ${subtitle}`
        : getVaultSubtitle(vault);
      break;

    case "none":
    default:
      // No indicators
      break;
  }

  return {
    subtitle,
    accessories: accessories.length > 0 ? accessories : undefined,
  };
}

/**
 * Hook to get vault indicator style from preferences
 */
export function useVaultIndicatorStyle(
  preferences: GlobalPreferences
): VaultIndicatorStyle {
  if (!preferences.showVaultIndicatorsInResults) {
    return "none";
  }
  return (preferences.vaultIndicatorStyle as VaultIndicatorStyle) || "badge";
}
