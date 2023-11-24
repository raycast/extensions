import { Icon } from "@raycast/api";
import { TITLES_FOR_KEYS } from "./constants";

function splitAndTitleCase(text: string) {
  const words = text.split("_");
  const titleCaseWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return titleCaseWords.join(" ");
}

export function getTitleFromKey(key: string) {
  return TITLES_FOR_KEYS[key as keyof typeof TITLES_FOR_KEYS] || splitAndTitleCase(key);
}

export function getTextAndIconFromVal(val: string) {
  let icon = undefined;
  let text = undefined;
  if (!val) icon = Icon.Minus;
  else {
    const uppercase = val.toUpperCase();
    if (uppercase === "ON" || uppercase === "YES") icon = Icon.Check;
    else if (uppercase === "OFF" || uppercase === "NO") icon = Icon.Multiply;
    else text = val;
  }
  return { text, icon };
}
