/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { Image } from "@raycast/api";
import { Color, Icon } from "@raycast/api";
import { getAvatarIcon, getFavicon } from "@raycast/utils";

import type { ViewRow } from "@/core/content/viewTypes";

import { DictionaryType } from "./kinds";
import type { ProviderIconConfig, ProviderIconName, QueryType } from "./types";

/** Play sound icon. */
export const playSoundIconGray: Image.ImageLike = {
  source: { light: "play.png", dark: "play.png" },
  tintColor: { light: "gray", dark: "lightgray" },
};

const raycastAIIcon: Image.ImageLike = {
  source: Icon.RaycastLogoNeg,
  tintColor: "#FF6363",
};

/**
 * Return the corresponding ImageLike based on the query and display types.
 */
export function getListItemIcon(item: ViewRow): Image.ImageLike {
  const service = item.service;
  if (service.serviceIcon) return getProviderIcon(service.serviceIcon, service.serviceLabel);
  if (service.type === DictionaryType.Linguee) return lingueeRowIcon(item);
  if (service.type === DictionaryType.Youdao) return youdaoRowIcon(item);
  return getQueryTypeIcon(service.type);
}

export function getProviderIcon(icon: ProviderIconConfig, name: string): Image.ImageLike {
  switch (icon.kind) {
    case "preset":
      if (icon.name === "raycast") return raycastAIIcon;
      return { source: providerIconAssets[icon.name], fallback: getAvatarIcon(name) };
    case "remote":
      return icon.url.startsWith("https://")
        ? { source: icon.url, fallback: getAvatarIcon(name) }
        : getAvatarIcon(name);
    case "favicon":
      return icon.website ? getFavicon(icon.website, { fallback: getAvatarIcon(name) }) : getAvatarIcon(name);
    case "initials":
      return getAvatarIcon(name);
  }
}

const providerIconAssets: Record<Exclude<ProviderIconName, "raycast">, string> = {
  openai: "OpenAI Translate.png",
  gemini: "Gemini Translate.png",
  deepseek: "provider-icons/deepseek.svg",
  openrouter: "provider-icons/openrouter.svg",
  siliconflow: "provider-icons/siliconflow.svg",
  zhipu: "provider-icons/zhipu.svg",
  kimi: "provider-icons/kimi.svg",
  minimax: "provider-icons/minimax.svg",
  mimo: "provider-icons/mimo.svg",
};

function lingueeRowIcon(row: ViewRow): Image.ImageLike {
  let color: Color.ColorLike = Color.PrimaryText;
  switch (row.kind) {
    case "translation":
      color = Color.Red;
      break;
    case "equivalent":
      if (row.prominent === false) {
        color = row.frequency === "less-common" ? Color.Yellow : "#CA8EC2";
        break;
      }
      switch (row.frequency) {
        case "almost-always":
        case "often":
          color = "#FF5151";
          break;
        case "special-forms":
          color = "#00BB00";
          break;
        case "less-common":
          color = Color.Yellow;
          break;
        default:
          color = Color.Blue;
      }
      break;
    case "example":
      color = "teal";
      break;
    case "related":
      color = "gray";
      break;
    case "summary":
      color = "#8080C0";
      break;
  }
  return { source: Icon.Dot, tintColor: color };
}

function youdaoRowIcon(row: ViewRow): Image.ImageLike {
  if (row.kind === "form-set" || row.kind === "form") return Icon.Receipt;
  let color: Color.ColorLike = Color.PrimaryText;
  switch (row.kind) {
    case "translation":
      color = Color.Red;
      break;
    case "chinese-entry":
      color = "#006000";
      break;
    case "definition":
      color = Color.Blue;
      break;
    case "web-translation":
      color = Color.Yellow;
      break;
    case "phrase":
      color = "teal";
      break;
    case "summary":
      if (row.summarySource === "encyclopedia") color = "#B15BFF";
      else if (row.summarySource === "wikipedia") color = "#FF60AF";
      break;
  }
  return { source: Icon.Dot, tintColor: color };
}

/**
 * Get query type icon based on the query type.
 */
export function getQueryTypeIcon(queryType: QueryType): Image.ImageLike {
  return { source: `${queryType}.png` };
}
