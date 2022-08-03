import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import isSvg from "is-svg";
import { optimize, OptimizedSvg } from "svgo";

export default async function Command() {
  const svgStr = await Clipboard.readText();

  if (svgStr && isSvg(svgStr)) {
    const res = optimize(svgStr);

    if (res.modernError?.message) {
      showToast({
        title: res.modernError?.message,
        style: Toast.Style.Failure,
      });
    } else {
      await Clipboard.copy((res as OptimizedSvg).data);

      showHUD("Copied to clipboard");
    }
  } else {
    showToast({
      title: "Please copy a svg first",
      style: Toast.Style.Failure,
    });
  }
}
