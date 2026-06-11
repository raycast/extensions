import { environment } from "@raycast/api";
import { getLobeIconCDN, toc } from "@lobehub/icons";

export type IconEntry = (typeof toc)[number];

export type AssetVariantGroup = "mono" | "color" | "text" | "text-cn" | "text-color" | "brand" | "brand-color";

export type AssetVariantTheme = "light" | "dark";

export type AssetVariant = {
  key: string;
  title: string;
  group?: AssetVariantGroup;
  theme?: AssetVariantTheme;
  isDarkMode?: boolean;
  type?: AssetVariantGroup;
  format: "svg" | "png" | "avatar";
};

export type PreparedIconEntry = IconEntry & {
  previewUrl: string;
  searchText: string;
};

export function getSlug(iconId: string) {
  return iconId.toLowerCase();
}

export function getAssetUrl(icon: IconEntry, variant: AssetVariant) {
  return getLobeIconCDN(getSlug(icon.id), {
    format: variant.format,
    isDarkMode: variant.isDarkMode,
    type: variant.type ?? "mono",
  });
}

export function getPrimaryAssetType(icon: IconEntry): AssetVariantGroup {
  if (icon.param.hasColor) {
    return "color";
  }

  if (icon.param.hasBrandColor) {
    return "brand-color";
  }

  if (icon.param.hasBrand) {
    return "brand";
  }

  return "mono";
}

export function isAssetVariantAvailable(icon: IconEntry, variant: AssetVariant) {
  switch (variant.type) {
    case undefined:
    case "mono":
      return true;
    case "color":
      return icon.param.hasColor;
    case "text":
      return icon.param.hasText;
    case "text-cn":
      return icon.param.hasTextCn;
    case "text-color":
      return icon.param.hasTextColor;
    case "brand":
      return icon.param.hasBrand;
    case "brand-color":
      return icon.param.hasBrandColor;
    default:
      return false;
  }
}

function getKeywords(icon: IconEntry) {
  const hostname = getHostname(icon.desc);

  return [
    icon.id,
    icon.title,
    icon.fullTitle,
    icon.group,
    hostname,
    icon.color,
    ...(icon.param.hasColor ? ["color"] : []),
    ...(icon.param.hasBrand ? ["brand"] : []),
    ...(icon.param.hasBrandColor ? ["brand-color"] : []),
    ...(icon.param.hasText ? ["text"] : []),
    ...(icon.param.hasTextCn ? ["text-cn"] : []),
    ...(icon.param.hasTextColor ? ["text-color"] : []),
    ...(icon.param.hasCombine ? ["combine"] : []),
    ...(icon.param.hasAvatar ? ["avatar"] : []),
  ];
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function prepareIcon(icon: IconEntry): PreparedIconEntry {
  const slug = getSlug(icon.id);
  const primaryAssetType = getPrimaryAssetType(icon);
  const isDarkMode = environment.appearance === "dark";
  const searchText = getKeywords(icon).filter(Boolean).join(" ").toLowerCase();

  return {
    ...icon,
    previewUrl: getLobeIconCDN(slug, { format: "png", type: primaryAssetType, isDarkMode }),
    searchText,
  };
}

export const preparedIcons = toc.map(prepareIcon);
