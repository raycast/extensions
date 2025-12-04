import { Icon } from "@raycast/api";
import {
  DIRECTADMIN_URL,
  RESELLER_API_TOKEN,
  RESELLER_PASSWORD,
  RESELLER_USERNAME,
  TITLES_FOR_KEYS,
} from "./constants";

function splitAndTitleCase(text: string) {
  const words = text.split("_");
  const titleCaseWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return titleCaseWords.join(" ");
}

export function getTitleFromKey(key: string) {
  return TITLES_FOR_KEYS[key as keyof typeof TITLES_FOR_KEYS] || splitAndTitleCase(key);
}

export function getTextAndIconFromVal(val: string | boolean) {
  let icon = undefined;
  let text = undefined;

  const uppercase = val.toString().toUpperCase();
  switch (uppercase) {
    case "ON":
    case "YES":
    case "TRUE":
      icon = Icon.Check;
      break;

    case "OFF":
    case "NO":
    case "FALSE":
      icon = Icon.Xmark;
      break;

    default:
      text = val.toString();
      break;
  }

  return { text, icon };
}

export function generateApiToken(userToImpersonate = "") {
  return userToImpersonate === ""
    ? RESELLER_API_TOKEN
    : btoa(`${RESELLER_USERNAME}|${userToImpersonate}:${RESELLER_PASSWORD}`);
}

export function isInvalidUrl() {
  try {
    new URL(DIRECTADMIN_URL);
    return false;
  } catch (error) {
    return true;
  }
}
