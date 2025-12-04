import { regexList } from "../assets/regexList";
import { getPreferenceValues, showHUD } from "@raycast/api";

interface Preferences {
  enabled: boolean;
  replaceTwitter: boolean;
  replaceTiktok: boolean;
  replaceInstagram: boolean;
  replaceReddit: boolean;
}

export const linkReplacer = (link: string) => {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.enabled) {
    showHUD("Extension is disabled");
    return;
  }

  let replacedString = link;

  for (const item of regexList) {
    if (!preferences[item.settingsKey]) continue;
    replacedString = replacedString.replace(item.test, item.replace);
  }

  if (link === replacedString) {
    showHUD("No text to transform");
    return;
  }

  return replacedString;
};
