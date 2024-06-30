import { showHUD } from "@raycast/api";
import { showTips } from "../types/preferences";

export const showCustomHud = async (title: string) => {
  if (showTips) {
    await showHUD(title);
  }
};
