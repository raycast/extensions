import { Image } from "@raycast/api";
import { BringUserSettings } from "./api";

export function getImageUrl(name: string): Image.URL {
  return `https://web.getbring.com/assets/images/items/${normalizeString(name)}.png`;
}

export function getFallbackChar(name: string): string {
  return `chars/${normalizeString(name.charAt(0))}.webp`;
}

function normalizeString(str: string): string {
  return str
    .toLocaleLowerCase()
    .replace(/\s/g, "_")
    .replace(/ /g, "_")
    .replace(/-/g, "_")
    .replace(/!/g, "_")
    .replace(/[\u00e4|\u00c4]/g, "ae")
    .replace(/[\u00f6|\u00d6]/g, "oe")
    .replace(/[\u00fc|\u00dc]/g, "ue")
    .replace(/\u00e9/g, "e");
}

export function getLocaleFromSettings(settings: BringUserSettings): string {
  const defaultListUuid = settings.usersettings.find((setting) => setting.key === "defaultListUUID")?.value;
  return (
    settings.userlistsettings
      .find((list) => list.listUuid === defaultListUuid)
      ?.usersettings.find((setting) => setting.key === "listArticleLanguage")?.value || "de-CH"
  );
}
