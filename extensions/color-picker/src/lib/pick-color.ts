import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { callbackLaunchCommand } from "raycast-cross-extension";
import colorNamer from "color-namer";
import { addToHistory } from "./history";
import { Color, PickColorCommandLaunchProps } from "./types";
import { getColorByProximity, getFormattedColor, isMac } from "./utils";

type PickColorOptions = {
  launchContext?: Pick<
    NonNullable<PickColorCommandLaunchProps["launchContext"]>,
    "copyToClipboard" | "callbackLaunchOptions"
  >;
  showColorName?: boolean;
};

export async function pickAndHandleColor({ launchContext, showColorName = false }: PickColorOptions) {
  let pickColor: () => Promise<Color | undefined | null>;
  if (isMac) {
    const { pickColor: pickColorSwift } = await import("swift:../../swift/color-picker");
    pickColor = pickColorSwift;
  } else {
    const { pick_color: pickColorRust } = await import("rust:../../rust/color-picker");
    // The Rust binding types use color_space, but serde returns colorSpace at runtime.
    pickColor = pickColorRust as () => Promise<Color | undefined | null>;
  }

  const pickedColor = await pickColor();
  if (!pickedColor) return "cancelled";

  addToHistory(pickedColor);
  const hex = getFormattedColor(pickedColor, "hex");
  const formattedColor = getFormattedColor(pickedColor);
  if (!formattedColor) throw new Error("Failed to format color");

  if (launchContext?.callbackLaunchOptions) {
    if (launchContext.copyToClipboard) await Clipboard.copy(formattedColor);
    try {
      await callbackLaunchCommand(launchContext.callbackLaunchOptions, { hex, formattedColor });
    } catch (e) {
      await showFailureToast(e);
    }
    return "callback";
  }

  await Clipboard.copy(formattedColor);
  const firstColorName = showColorName ? getColorByProximity(colorNamer(hex))[0]?.name : undefined;
  const colorDescription = showColorName ? `${formattedColor} (${firstColorName})` : formattedColor;
  await showHUD(`Copied color ${colorDescription} to clipboard`);
  return "copied";
}
