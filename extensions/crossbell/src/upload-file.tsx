import { Clipboard, getSelectedFinderItems, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ipfsUploadFile } from "crossbell/ipfs";
import fs from "fs";
import fsp from "fs/promises";
import { FormData, fetch } from "node-fetch-native";
import pLimit from "p-limit";
import { fileURLToPath } from "url";

global.FormData = FormData;
global.fetch = fetch;

const limit = pLimit(10);

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();
    try {
      const filePaths = selectedItems.map((item) => item.path).filter((path) => fs.lstatSync(path).isFile());
      if (filePaths.length === 0) {
        showFailureToast("No files selected");
        return;
      }

      if (filePaths.length > 10) {
        await showHUD(`Uploading ${filePaths.length} files... (this may take a while)`);
      } else {
        await showHUD(`Uploading ${filePaths.length} files...`);
      }

      const files = await Promise.all(filePaths.map((path) => fsp.readFile(path)));
      const results = await Promise.allSettled(
        files.map((file) => {
          return limit(async () => {
            return await ipfsUploadFile(new Blob([file]));
          });
        }),
      );

      const failedResults = results.filter((result) => result.status === "rejected");
      if (failedResults.length > 0) {
        const errorMessages = failedResults.map((result) => {
          if (result.status === "rejected" && result.reason instanceof Error) {
            return result.reason.message;
          }
          return "Unknown error";
        });
        showFailureToast("Failed to upload files: " + errorMessages.join(", "));
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
      return;
    } catch (error) {
      if (error instanceof Error) {
        showFailureToast("Failed to upload files: " + error.message);
      }
      return;
    }
  } catch (error) {
    // We don't have any selected items, so we'll try to upload the file from the clipboard
    /* empty */
  }

  const { file } = await Clipboard.read();
  if (!file) {
    showToast({ title: "No file found to upload" });
    return;
  }

  try {
    await showHUD("Uploading file from clipboard...");
    const fileContent = await fsp.readFile(fileURLToPath(file));
    const result = await ipfsUploadFile(new Blob([fileContent]));
    Clipboard.copy(result.web2url);
    await showHUD("Uploaded successfully, URL copied to clipboard");
  } catch (error) {
    if (error instanceof Error) {
      showFailureToast("Failed to upload file: " + error.message);
    }
  }
}
