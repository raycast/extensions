import { Clipboard, closeMainWindow, showHUD, showToast, Toast, getPreferenceValues } from "@raycast/api";
import isSvg from "is-svg";
import { optimize } from "svgo";

export default async function Command() {
  const { paste } = getPreferenceValues();

  try {
    const svgStr = await Clipboard.readText();

    if (!svgStr || !isSvg(svgStr)) throw Error("Not a valid SVG");

    const res = optimize(svgStr);

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
