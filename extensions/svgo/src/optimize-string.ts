import {
  Clipboard,
  closeMainWindow,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";
import isSvg from "is-svg";
import { optimize } from "svgo";

export default async function Command() {
  const { paste } = getPreferenceValues();
  await closeMainWindow();

  try {
    const svgStr = await Clipboard.readText();

    if (!svgStr || !isSvg(svgStr)) throw Error("Not a valid SVG");

    const res = optimize(svgStr);

    await Clipboard[paste ? "paste" : "copy"](res.data);
    showHUD("Copied to clipboard");
  } catch (error) {
    /**
     * To distinguish between SVGO parsing errors and runtime errors we can
     * check for `error.name === 'SvgoParserError'`.
     */
    console.error(error);
    showHUD(`❌ ${String(error)}`);
  }
}
