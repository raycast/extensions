import { Clipboard, closeMainWindow, showHUD, PopToRootType } from "@raycast/api";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import url from "node:url";
import * as fileType from "file-type";
import { setupGyazo, uploadImageToGyazo } from "./utils/Gyazo";

const imageExtensions = ["jpeg", "jpg", "png", "gif"];

export default async function UploadGyazoFromClioboard() {
  await setupGyazo();

  try {
    // get image from clipboard
    const { file } = await Clipboard.read();
    if (!file) {
      await closeMainWindow();
      await showHUD("❌ Opps! No image found in clipboard", {
        clearRootSearch: true,
      });
      return;
    }

    const filePath = url.fileURLToPath(file);

    // verify if it's an image
    const fileBuffer = await readFile(filePath);
    const mimeType = await fileType.fileTypeFromBuffer(fileBuffer);
    if (!mimeType || !imageExtensions.includes(mimeType.ext)) {
      await closeMainWindow();
      await showHUD("❌ Opps! No image found in clipboard", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
      return;
    }

    await showHUD("⏳ Uploading image to Gyazo...", {
      clearRootSearch: true,
    });

    const res = await uploadImageToGyazo({
      fileBuffer,
      fileName: randomUUID() + "." + mimeType.ext,
    });

    if (!res) {
      await closeMainWindow();
      await showHUD("❌ Opps! Faild to Upload.", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
      return;
    }

    await Clipboard.copy(res.permalink_url);
    await showHUD("🚀 Image uploaded and permalink copied to clipboard.", {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
    return;
  } catch (error) {
    console.log(error);
    await closeMainWindow();
    await showHUD("❌ Opps! Faild to Upload.", {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
    return;
  }
}
