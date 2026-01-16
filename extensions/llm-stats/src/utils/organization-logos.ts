import { Icon, Image } from "@raycast/api";

/**
 * Base URL for @lobehub/icons-static-svg CDN
 */
const LOBE_ICONS_CDN = "https://unpkg.com/@lobehub/icons-static-svg@latest/icons";

/**
 * Helper function to get Lobe Icons CDN URL
 * @param iconName - The icon name in Lobe Icons
 * @param colored - Whether to use the colored version (default: true)
 * @returns CDN URL for the icon
 */
function getLobeIconUrl(iconName: string, colored: boolean = true): string {
  return `${LOBE_ICONS_CDN}/${iconName}${colored ? "-color" : ""}.svg`;
}

/**
 * Static hashmap mapping organization IDs to their logo URLs
 * Uses @lobehub/icons CDN for logo images
 */
export const ORGANIZATION_LOGOS: Record<string, Image.Source> = {
  openai: getLobeIconUrl("openai", false),
  anthropic: getLobeIconUrl("claude"),
  google: getLobeIconUrl("gemini"),
  xai: getLobeIconUrl("xai", false),
  moonshotai: getLobeIconUrl("moonshot", false),
  minimax: getLobeIconUrl("minimax"),
  "zai-org": getLobeIconUrl("zai", false),
  xiaomi: getLobeIconUrl("xiaomi"),
  nvidia: getLobeIconUrl("nvidia"),
  deepseek: getLobeIconUrl("deepseek"),
  qwen: getLobeIconUrl("qwen"),
  "nous-research": getLobeIconUrl("nousresearch", false),
  bytedance: getLobeIconUrl("bytedance"),
  "black-forest-labs": getLobeIconUrl("bfl", false),
  "recraft-ai": getLobeIconUrl("recraft", false),
  tencent: getLobeIconUrl("tencent"),
  luma: getLobeIconUrl("luma"),
  kling: getLobeIconUrl("kling"),
  elevenlabs: getLobeIconUrl("elevenlabs", false),
  mistral: getLobeIconUrl("mistral"),
  meta: getLobeIconUrl("meta"),
};

/**
 * Gets the logo for an organization by its ID
 * @param organizationId - The organization ID
 * @returns Image object with source and fallback
 */
export function getOrganizationLogo(organizationId: string): Image {
  const logoUrl = ORGANIZATION_LOGOS[organizationId];

  return {
    source: logoUrl || Icon.Stars,
    fallback: Icon.Stars,
  };
}
