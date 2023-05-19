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

    if (res.modernError) throw Error(res.modernError.message);

    await Clipboard[paste ? "paste" : "copy"](res.data);
    showHUD("Copied to clipboard");
  } catch (error) {
    console.error(error);
    showHUD(`❌ ${String(error)}`);
  }
}
