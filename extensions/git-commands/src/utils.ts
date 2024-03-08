import { Color, getPreferenceValues } from "@raycast/api";
import { default as data } from "./alias.json";
import { Alias, AliasType } from "./types";

const preferences = getPreferenceValues();
export const showDescription = preferences.ItemAliasShowDescription;
export const showTypeColor = preferences.ItemAliasTypeColor;

export function getData() {
  return data as Alias[];
}

export function typeColor(type: AliasType) {
  if (!showTypeColor) {
    return Color.SecondaryText;
  }

  return {
    show: Color.Blue,
    default: Color.Yellow,
    delete: Color.Red,
  }[type];
}

export function typeDescription(type: AliasType) {
  return {
    show: "The command only shows information, no changes are made.",
    default: "The command can edit, move or delete files.",
    delete: "The command is directly related to the deletion information.",
  }[type];
}
