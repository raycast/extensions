/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { Image } from "@raycast/api";
import { Color, Icon } from "@raycast/api";

import { LingueeListItemType } from "@/providers/dictionary/linguee/types";
import { YoudaoDictionaryListItemType } from "@/providers/dictionary/youdao/types";
import { DictionaryType } from "@/types/api";
import type { ListDisplayItem } from "@/types/display";
import type { QueryType } from "@/types/query";

/**
 * Play sound icons with different tint colors.
 */
export const playSoundIconBlack: Image.ImageLike = {
  source: { light: "play.png", dark: "play.png" },
  tintColor: { light: "black", dark: "lightgray" },
};

export const playSoundIconGray: Image.ImageLike = {
  source: { light: "play.png", dark: "play.png" },
  tintColor: { light: "gray", dark: "lightgray" },
};

/**
 * Return the corresponding ImageLike based on the query and display types.
 */
export function getListItemIcon(item: ListDisplayItem): Image.ImageLike {
  if (item.queryType === DictionaryType.Linguee) {
    return getLingueeListItemIcon(item.displayType);
  }
  if (item.queryType === DictionaryType.Youdao) {
    return getYoudaoListItemIcon(item.displayType);
  }
  return getQueryTypeIcon(item.queryType);
}

/**
 * Get ImageLike based on LingueeDisplayType.
 */
function getLingueeListItemIcon(lingueeDisplayType: LingueeListItemType): Image.ImageLike {
  let dotColor: Color.ColorLike = Color.PrimaryText;
  switch (lingueeDisplayType) {
    case LingueeListItemType.Translation: {
      dotColor = Color.Red;
      break;
    }
    case LingueeListItemType.AlmostAlwaysUsed:
    case LingueeListItemType.OftenUsed: {
      dotColor = "#FF5151";
      break;
    }
    case LingueeListItemType.SpecialForms: {
      dotColor = "#00BB00";
      break;
    }
    case LingueeListItemType.Common: {
      dotColor = Color.Blue;
      break;
    }
    case LingueeListItemType.LessCommon: {
      dotColor = Color.Yellow;
      break;
    }
    case LingueeListItemType.Unfeatured: {
      dotColor = "#CA8EC2";
      break;
    }
    case LingueeListItemType.Example: {
      dotColor = "teal";
      break;
    }
    case LingueeListItemType.RelatedWord: {
      dotColor = "gray";
      break;
    }
    case LingueeListItemType.Wikipedia: {
      dotColor = "#8080C0";
      break;
    }
  }
  return { source: Icon.Dot, tintColor: dotColor };
}

/**
 * Get ImageLike based on YoudaoDisplayType.
 */
function getYoudaoListItemIcon(youdaoListType: YoudaoDictionaryListItemType): Image.ImageLike {
  let dotColor: Color.ColorLike = Color.PrimaryText;
  switch (youdaoListType) {
    case YoudaoDictionaryListItemType.Translation: {
      dotColor = Color.Red;
      break;
    }
    case YoudaoDictionaryListItemType.ModernChineseDict: {
      dotColor = "#006000";
      break;
    }
    case YoudaoDictionaryListItemType.Explanation: {
      dotColor = Color.Blue;
      break;
    }
    case YoudaoDictionaryListItemType.WebTranslation: {
      dotColor = Color.Yellow;
      break;
    }
    case YoudaoDictionaryListItemType.WebPhrase: {
      dotColor = "teal";
      break;
    }
    case YoudaoDictionaryListItemType.Baike: {
      dotColor = "#B15BFF";
      break;
    }
    case YoudaoDictionaryListItemType.Wikipedia: {
      dotColor = "#FF60AF";
      break;
    }
  }

  if (youdaoListType === YoudaoDictionaryListItemType.Forms) {
    return Icon.Receipt;
  }

  return { source: Icon.Dot, tintColor: dotColor };
}

/**
 * Get query type icon based on the query type.
 */
export function getQueryTypeIcon(queryType: QueryType): Image.ImageLike {
  return { source: `${queryType}.png` };
}
