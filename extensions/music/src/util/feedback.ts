import { showHUD } from "@raycast/api";
import { getHudDisabled } from "./preferences";

export const hud = (text: string) => {
  if (getHudDisabled()) {
    // disable HUD
    return Promise.resolve();
  }

  return showHUD(text);
};
