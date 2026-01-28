import { Image } from "@raycast/api";
import { BringUserSettings } from "./bringAPI";

export function getImageUrl(name: string): Image.URL {
  return `https://web.getbring.com/assets/images/items/${normalizeString(name)}.png`;
}

function normalizeString(str: string): string {
  return str
    .toLocaleLowerCase()
    .replace(/\s/g, "_")
    .replace(/ /g, "_")
    .replace(/-/g, "_")
    .replace(/!/g, "")
    .replace(/[\u00e4|\u00c4]/g, "ae")
    .replace(/[\u00f6|\u00d6]/g, "oe")
    .replace(/[\u00fc|\u00dc]/g, "ue")
    .replace(/\u00e9/g, "e");
}

export function getIconPlaceholder(name: string): string {
  return `chars/${getUnicodeNameForIconPlaceholder(name)}.webp`;
}

function getUnicodeNameForIconPlaceholder(name: string) {
  const charCode = "00" + name.toUpperCase().charCodeAt(0).toString(16);
  return "u_" + charCode.substring(charCode.length - 4);
}

export function getLocaleForListFromSettings(listUuid?: string): (settings: BringUserSettings) => string {
  return (settings: BringUserSettings): string =>
    settings.userlistsettings
      .find((list) => list.listUuid === listUuid)
      ?.usersettings.find((setting) => setting.key === "listArticleLanguage")?.value || "de-CH";
}
