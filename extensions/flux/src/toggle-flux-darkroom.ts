import { closeMainWindow, showToast } from "@raycast/api";
import { COLOR_EFFECT_DARKROOM, ColorEffect, getMenuState, setColorEffect } from "./flux-api";
import { DEFAULT_ERROR_TOAST } from "./constants";

export default async function ToggleFluxDarkroom() {
  await closeMainWindow();

  const currEnabled = await getMenuState(COLOR_EFFECT_DARKROOM);
  const success = await setColorEffect(ColorEffect.Darkroom);

  await showToast(success ? { title: `f.lux darkroom ${currEnabled ? "disabled" : "enabled"}` } : DEFAULT_ERROR_TOAST);
}
