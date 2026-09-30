import { showToast, showHUD, Clipboard, Toast } from "@raycast/api";
import { pixelToViewportUnit } from "./utils";

export default async function Command(props: { arguments: { height: string; pixels: string } }) {
  const { height, pixels } = props.arguments;

  const heightInt = height == "" ? -1 : parseInt(height);
  const pixelsInt = pixels == "" ? -1 : parseInt(pixels);

  if (isNaN(heightInt)) {
    await showToast({ title: "Height must be an integer", style: Toast.Style.Failure });
    return;
  } else if (isNaN(pixelsInt)) {
    await showToast({ title: "Pixels must be an integer", style: Toast.Style.Failure });
    return;
  }

  if (heightInt > 0 && pixelsInt > 0) {
    const resultConvertion = pixelToViewportUnit({ pixels: pixels, width: null, height: height });

    if (!isNaN(parseFloat(resultConvertion as string))) {
      await Clipboard.copy(resultConvertion + "vh");
      showHUD(`📋 ${resultConvertion}vh copied to clipboard`);
      showToast({ title: "Copied to clipboard:", message: resultConvertion + "vh" });
    }
  } else {
    await showToast({ title: "Height and Pixels must be greater than 0", style: Toast.Style.Failure });
    return;
  }
}
