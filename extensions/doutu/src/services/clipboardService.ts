import { environment, showHUD, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import fs from "fs";
import proc from "child_process";

export default {
  imageToClipboard: async (imageUrl: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Waiting",
      message: "Being copied to the clipboard...",
    });
    const tempDir = `${environment.assetsPath}/temp`;
    if (!fs.existsSync(tempDir)) await fs.mkdirSync(tempDir);
    else {
      const files = fs.readdirSync(tempDir);
      if (files.length >= 10) files.forEach((file) => fs.unlinkSync(`${tempDir}/${file}`));
    }

    // console.log(imageUrl);
    const fileName = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
    const response = await fetch(imageUrl);
    const data = await response.arrayBuffer();
    const filePath = `${tempDir}/${fileName}`;
    await fs.writeFileSync(filePath, new Uint8Array(data), "binary");
    proc.exec(`osascript -e 'set the clipboard to (read (POSIX file "${filePath}") as JPEG picture)'`);
    toast.hide();
    showHUD("✅ Copied to clipboard");
  },
};
