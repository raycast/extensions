import { showHUD } from "@raycast/api";
import { showTips } from "../types/preferences";

export const showCustomHud = async (title: string) => {
  if (showTips) {
    await showHUD(title);
  }
};

export function truncate(str: string, maxLength: number = 55): string {
  return str.substring(0, maxLength) + (maxLength < str.length ? "…" : "");
}
