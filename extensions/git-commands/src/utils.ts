import { Color, getPreferenceValues } from "@raycast/api";
import { default as data } from "./alias.json";
import { Alias, AliasType } from "./types";

const preferences = getPreferenceValues();
export const showDescription = preferences.listItemInfo === "full";

export function getData() {
  return data as Alias[];
}

export function typeColor(type: AliasType) {
  return {
    show: Color.Blue,
    default: Color.Yellow,
    delete: Color.Red,
  }[type];
}
