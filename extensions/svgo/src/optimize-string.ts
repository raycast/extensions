import { Clipboard, closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import isSvg from "is-svg";
import { configHelper } from "./utils-2";
import { optimizeSvg } from "./optimizer";

export default async function Command() {
  const { paste } = getPreferenceValues<{ paste: boolean }>();

  try {
    const plugins = configHelper.getEnabledPlugins();
    const svgStr = await Clipboard.readText();

    if (!svgStr || !isSvg(svgStr)) throw Error("Not a valid SVG");

    const optimized = optimizeSvg(svgStr, plugins);

    await Clipboard[paste ? "paste" : "copy"](optimized);
    await closeMainWindow();
    const originalSize = configHelper.formatBytes(new TextEncoder().encode(svgStr).length);
    const newSize = configHelper.formatBytes(new TextEncoder().encode(optimized).length);

    showToast({
      style: Toast.Style.Success,
      title: `Copied to clipboard! ${originalSize} → ${newSize}`,
      message: `From ${originalSize} to ${newSize}`,
    });
  } catch (error) {
    console.error(error);
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong!",
      message: String(error),
    });
  }
}
