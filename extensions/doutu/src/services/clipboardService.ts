import { environment, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fetch from "node-fetch";
import fs from "fs";
import imageType from "image-type";

export default {
  imageToClipboard: async (imageUrl: string) => {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Waiting",
        message: "Being copied to the clipboard...",
      });
      const tempDir = `${environment.supportPath}`;
      if (!fs.existsSync(tempDir)) await fs.mkdirSync(tempDir);
      else {
        const files = fs.readdirSync(tempDir);
        if (files.length >= 10) files.forEach((file) => fs.unlinkSync(`${tempDir}/${file}`));
      }

      const fileName = Math.random().toString(36).substring(2);
      const response = await fetch(imageUrl);
      const data = await response.arrayBuffer();
      const buffer = new Uint8Array(data);
      const type = await imageType(buffer);
      let file = `${tempDir}/${fileName}`;
      if (!fileName.endsWith(`.${type?.ext}`)) file += `.${type?.ext}`;
      await fs.writeFileSync(file, buffer, "binary");
      if (type?.mime === "image/gif") {
        await runAppleScript(`tell app "Finder" to set the clipboard to (POSIX file "${file}")`);
      } else {
        await runAppleScript(`set the clipboard to (read (POSIX file "${file}") as JPEG picture)`);
      }
      toast.hide();
      showHUD("✅ Copied to clipboard");
    } catch (e) {
      const error = e as { message: string | undefined; stderr: string | undefined };
      if (error.stderr) {
        const match = error.stderr.match(/error:\s?(.*)/);
        if (match) {
          showHUD(`⭕ ${match[1]}`);
        } else {
          showHUD(`⭕ ${error.stderr}`);
        }
      } else showHUD(`⭕ ${error.message || error}`);
    }
  },
};
