import { Icon, Color, getPreferenceValues } from "@raycast/api";
import { default as data } from "./alias.json";
import { Alias, AliasType } from "./types";

export const preferences = getPreferenceValues();

export function getData() {
  return data as Alias[];
}

export function typeColor(type: AliasType) {
  if (preferences.colors == "all") {
    return {
      show: Color.Green,
      default: Color.Blue,
      delete: Color.Red,
    }[type];
  }

  return Color.SecondaryText;
}

export function iconStar() {
  if (preferences.colors != "no") {
    return { source: Icon.Star, tintColor: Color.Yellow };
  } else {
    return { source: Icon.Star };
  }
}

export function typeDescription(type: AliasType) {
  return {
    show: "Only shows information.",
    default: "Can edit, move or delete.",
    delete: "Related to information deletion.",
  }[type];
}

export function mainCommand(command: string) {
  const result = command.split(" ");
  return result.length > 1 ? result.slice(1, 2) : "git";
}
