import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { temporaryWrite } from "tempy";

export async function copyFileToClipboard(url: string, name: string) {
  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error(`Slackmoji download failed. Server responded with ${response.status}`);
  }

  if (response.body === null) {
    throw new Error("Unable to read Slackmoji response");
  }

  let file: string;
  try {
    file = await temporaryWrite(response.body, { name: `${name}.gif` });
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to download Slackmoji: "${error.message}"`);
  }

  try {
    await Clipboard.copy({ file });
    await closeMainWindow();
    await showToast(Toast.Style.Success, `Slackmoji "${name}" copied to clipboard`);
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to copy Slackmoji: "${error.message}"`);
  }
}
