import { Clipboard, closeMainWindow, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import isSvg from "is-svg";
import { optimize } from "svgo";
import { configHelper } from "./utils-2";

export default async function Command() {
  const { paste } = getPreferenceValues();

  try {
    const plugins = configHelper.getEnabledPlugins();
    const svgStr = await Clipboard.readText();

    if (!svgStr || !isSvg(svgStr)) throw Error("Not a valid SVG");

    const res = optimize(svgStr, {
      plugins: plugins,
    });

    await Clipboard[paste ? "paste" : "copy"](res.data);
    await closeMainWindow();
    showHUD("Copied to clipboard");
  } catch (error) {
    console.error(error);
    /**
     * If needed, we can distinguish between SVGO parsing errors and runtime
     * errors by checking for `error.name === 'SvgoParserError'`.
     */
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong!",
      message: String(error),
    });
  }
}
