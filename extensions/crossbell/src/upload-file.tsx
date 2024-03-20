import { Clipboard, showToast, getSelectedFinderItems, showHUD, closeMainWindow } from "@raycast/api";
import fs from "fs";
import fsp from "fs/promises";
import { ipfsUploadFile } from "crossbell/ipfs";
import { fetch, FormData } from "node-fetch-native";
import { showFailureToast } from "@raycast/utils";
import { fileURLToPath } from "url";

global.FormData = FormData;
global.fetch = fetch;

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();
    try {
      closeMainWindow();
      const filePaths = selectedItems.map((item) => item.path).filter((path) => fs.lstatSync(path).isFile());
      if (filePaths.length > 0) {
        const files = await Promise.all(
          filePaths.map(async (path) => {
            const data = await fsp.readFile(path);
            return { name: path, data };
          }),
        );
        console.log({ files });
        const results = await Promise.all(
          files.map(async (file) => {
            const result = await ipfsUploadFile(new Blob([file.data]));
            return { name: file.name, result };
          }),
        );
        const urls = results.map((result) => result.result.web2url);
        Clipboard.copy(urls.join("\n"));
        showHUD("URL copied to clipboard");
        return;
      }
    } catch (error) {
      showFailureToast("Failed to upload file" + error);
      return;
    }
  } catch (error) {
    /* empty */
  }

  const { file } = await Clipboard.read();
  if (!file) {
    showToast({ title: "No file found in clipboard" });
    return;
  }

  try {
    closeMainWindow();
    const fileContent = await fsp.readFile(fileURLToPath(file));
    const result = await ipfsUploadFile(new Blob([fileContent]));
    Clipboard.copy(result.web2url);
    showHUD("URL copied to clipboard");
  } catch (error) {
    showFailureToast("Failed to upload file" + error);
  }
}
