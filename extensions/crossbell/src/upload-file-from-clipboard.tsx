import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ipfsUploadFile } from "crossbell/ipfs";
import fsp from "fs/promises";
import { FormData, fetch } from "node-fetch-native";
import { fileURLToPath } from "url";

global.FormData = FormData;
global.fetch = fetch;

export default async function Command() {
  const { file } = await Clipboard.read();
  if (!file) {
    showFailureToast(new Error("No file found in clipboard"));
    return;
  }

  try {
    await showHUD("Uploading file from clipboard...");
    const fileContent = await fsp.readFile(fileURLToPath(file));
    const result = await ipfsUploadFile(new Blob([fileContent]));

    Clipboard.copy(result.web2url);
    await showHUD("Uploaded successfully, URL copied to clipboard");
  } catch (error) {
    showFailureToast(error, { title: "Failed to upload file from clipboard, please check your network connection" });
  }
}
