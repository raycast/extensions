import { showToast, showHUD, Clipboard, Toast } from "@raycast/api";
import { pixelToViewportUnit } from "./utils";

export default async function Command(props: { arguments: { width: string; pixels: string } }) {
  const { width, pixels } = props.arguments;

  const widthInt = width == "" ? -1 : parseInt(width);
  const pixelsInt = pixels == "" ? -1 : parseInt(pixels);

  if (isNaN(widthInt)) {
    await showToast({ title: "Width must be an integer", style: Toast.Style.Failure });
    return;
  } else if (isNaN(pixelsInt)) {
    await showToast({ title: "Pixels must be an integer", style: Toast.Style.Failure });
    return;
  }

  if (widthInt > 0 && pixelsInt > 0) {
    const resultConvertion = pixelToViewportUnit({ pixels: pixels, width: width, height: null });

    if (!isNaN(parseFloat(resultConvertion as string))) {
      await Clipboard.copy(resultConvertion + "vw");
      showHUD(`📋 ${resultConvertion}vw copied to clipboard`);
      showToast({ title: "Copied to clipboard:", message: resultConvertion + "vw" });
    }
  } else {
    await showToast({ title: "Width and Pixels must be greater than 0", style: Toast.Style.Failure });
    return;
  }
}
