import { environment, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { writeFileSync } from "fs";
import { join } from "path";
import { readClipboardImageBase64 } from "./clipboard-image";
import { generateDrawingPage } from "./drawing-page";

function getHtmlPath(): string {
  return join(environment.supportPath, "raycast-simple-draw.html");
}

export default async function Command() {
  let base64Image: string | undefined;

  try {
    base64Image = await readClipboardImageBase64();
  } catch (error) {
    await showFailureToast(error, {
      title: "Could Not Read Clipboard",
      message: "Copy an image, then try again.",
    });
    return;
  }

  if (!base64Image) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Image in Clipboard",
      message:
        "Copy an image (screenshot or Copy Image), not just a file path or link.",
    });
    return;
  }

  const htmlPath = getHtmlPath();
  try {
    writeFileSync(htmlPath, generateDrawingPage(base64Image));
  } catch (error) {
    await showFailureToast(error, {
      title: "Could Not Prepare Canvas",
    });
    return;
  }

  try {
    const { openViewer } = await import("swift:../swift/simple-draw");
    await showToast({
      style: Toast.Style.Success,
      title: "Simple Draw Opened",
    });
    await openViewer(htmlPath);
  } catch (error) {
    await showFailureToast(error, {
      title: "Could Not Open Simple Draw",
    });
    return;
  }
}
