import { getPreferenceValues } from "@raycast/api";
import { Preferences, Icon8, Style } from "../types/types";
import { svgToImage, defaultStyles } from "../utils/utils";
import fetch from "node-fetch";

const preferences: Preferences = getPreferenceValues();

const api: string = preferences.apiKey;
const numResults: number = preferences.numResults;

export const getIcons = async (search: string, style?: string): Promise<Icon8[]> => {
  let query = `https://search.icons8.com/api/iconsets/v5/search?term=${search}&token=${api}&amount=${numResults}`;
  if (style) {
    query += `&platform=${style}`;
  }
  const response = await fetch(query);
  const data: any = await response.json();
  const icons = data.icons;
  const icons8: Icon8[] = icons.map((icon: any) => ({
    id: icon.id,
    name: icon.name,
    url: `https://img.icons8.com/${icon.platform}/2x/${icon.commonName}.png`,
    link: `https://icons8.com/icon/${icon.id}/${icon.name}`,
    color: icon.isColor,
  }));
  return icons8;
};

export const getStyles = async (): Promise<Style[]> => {
  const query = `https://api-icons.icons8.com/publicApi/platforms?token=${api}&limit=588`;
  const response = await fetch(query);
  const data: any = await response.json();
  const platforms = data.docs
    .filter((platform: any) => platform.title in defaultStyles)
    .filter((platform: any) => platform.iconsCount > 0)
    .sort((a: any, b: any) => a.title.localeCompare(b.title));
  const styles: Style[] = platforms.map((platform: any) => ({
    code: platform.apiCode,
    title: platform.title,
    count: platform.iconsCount,
    url: platform.preview,
  }));
  return styles;
};

export const getIconDetail = async (icon8: Icon8): Promise<Icon8 | undefined> => {
  const query = `https://api-icons.icons8.com/publicApi/icons/icon?id=${icon8.id}&token=${api}`;
  const response = await fetch(query);
  const data: any = await response.json();
  const icon = data.icon;
  try {
    icon8 = {
      id: icon.id,
      name: icon.name,
      url: `https://img.icons8.com/${icon.platform}/2x/${icon.commonName}.png`,
      link: `https://icons8.com/icon/${icon.id}/${icon.name}`,
      color: icon.color,
      svg: icon.svg,
      mdImage: svgToImage(icon.svg, 256, 256, icon.color ? undefined : "#ffffff"),
      description: icon.description,
      style: icon.platformName,
      category: icon.categoryName,
      tags: icon.tags,
      isFree: icon.isFree,
      isAnimated: icon.isAnimated,
      published: new Date(icon.publishedAt),
    };
    return icon8;
  } catch (e: any) {
    console.error(e);
    return undefined;
  }
};
