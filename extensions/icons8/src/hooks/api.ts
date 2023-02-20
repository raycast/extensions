import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { defaultStyles, configureSVG } from "../utils/utils";
import { Icon8, Style, Options } from "../types/types";
import fetch from "node-fetch";

const { apiKey: api, numResults } = getPreferenceValues();

export const getIcons = async (search: string, style?: string): Promise<Icon8[]> => {
  let query = `https://search.icons8.com/api/iconsets/v5/search?term=${search}&token=${api}&amount=${numResults}`;
  if (style) {
    query += `&platform=${style}`;
  }
  try {
    const response = await fetch(query);
    if (response.status !== 200) {
      await showToast(Toast.Style.Failure, `Error Fetching Icons.`);
      return [];
    }
    const data: any = await response.json();
    const icons = data.icons;
    const icons8: Icon8[] = icons.map((icon: any) => ({
      id: icon.id,
      name: icon.name,
      commonName: icon.commonName,
      url: `https://img.icons8.com/${icon.platform}/$preview-size/${icon.commonName}.png`,
      link: `https://icons8.com/icon/${icon.id}/${icon.commonName}`,
      platform: icon.platform,
      isColor: icon.isColor,
    }));
    return icons8;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const getStyles = async (): Promise<Style[] | undefined> => {
  const query = `https://api-icons.icons8.com/publicApi/platforms?token=${api}&limit=588`;
  try {
    const response = await fetch(query);
    if (response.status !== 200) {
      return undefined;
    }
    const data: any = await response.json();
    const platforms = data.docs
      .filter((platform: any) => platform.title in defaultStyles && platform.iconsCount > 0 && platform.preview)
      .sort((a: any, b: any) => a.title.localeCompare(b.title));
    const styles: Style[] = platforms.map((platform: any) => ({
      code: platform.apiCode,
      title: platform.title,
      count: platform.iconsCount,
      url: platform.preview,
    }));
    return styles;
  } catch (e) {
    console.error(e);
    return undefined;
  }
};

export const getIconDetail = async (icon8: Icon8, options: Options): Promise<Icon8> => {
  const query = `https://api-icons.icons8.com/publicApi/icons/icon?id=${icon8.id}&token=${api}`;
  const response = await fetch(query);
  if (response.status !== 200) {
    await showToast(Toast.Style.Failure, `Error Fetching Icon.`);
    return icon8;
  }
  const data: any = await response.json();
  const icon = data.icon;
  icon8 = {
    ...icon8,
    svg: icon.svg,
    description: icon.description,
    style: icon.platformName,
    category: icon.categoryName,
    tags: icon.tags,
    isFree: icon.isFree,
    isAnimated: icon.isAnimated,
    published: new Date(icon.publishedAt),
    mdImage: `https://img.icons8.com/${icon8.platform}/300$color/${icon.commonName}.png`,
  };
  icon8.svg = configureSVG(icon8, options);
  return icon8;
};
