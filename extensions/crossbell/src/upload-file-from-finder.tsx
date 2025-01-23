import { Clipboard, getSelectedFinderItems, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ipfsUploadFile } from "crossbell/ipfs";
import fs from "fs";
import fsp from "fs/promises";
import { FormData, fetch } from "node-fetch-native";
import pLimit from "p-limit";

global.FormData = FormData;
global.fetch = fetch;

const limit = pLimit(10);

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();
    try {
      const filePaths = selectedItems.map((item) => item.path).filter((path) => fs.lstatSync(path).isFile());
      if (filePaths.length === 0) {
        showFailureToast(new Error("No files selected"));
        return;
      }

      await showHUD(`Uploading ${filePaths.length} files...${filePaths.length > 10 ? " (this may take a while)" : ""}`);

      const files = await Promise.all(filePaths.map((path) => fsp.readFile(path)));
      const results = await Promise.allSettled(
        files.map((file) => {
          return limit(async () => {
            return await ipfsUploadFile(new Blob([file]));
          });
        }),
      );

      const failedResults = results.filter((result) => result.status === "rejected");
      if (failedResults.length > 0 && failedResults[0].status === "rejected") {
        showFailureToast(failedResults[0].reason, { title: failedResults[0].reason.message });
        return;
      }

      const urls = results.map((result) => {
        if (result.status === "fulfilled") {
          return result.value.web2url;
        }
        return "Unknown URL";
      });
      Clipboard.copy(urls.join("\n"));
      await showHUD("Uploaded successfully, URL copied to clipboard");
    } catch (error) {
      showFailureToast(error);
    }
  } catch (error) {
    showFailureToast(error);
  }
}
