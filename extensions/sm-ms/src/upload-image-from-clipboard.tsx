import { Clipboard, closeMainWindow } from "@raycast/api";
import { uploadImageFromClipboard } from "./utils/axios-utils";
import fileUriToPath from "file-uri-to-path";

export default async () => {
  await closeMainWindow();
  const { text, file } = await Clipboard.read();
  console.log(text);
  console.log(file);
  if (typeof file !== "undefined") {
    const filePath = fileUriToPath(file);
    console.log(filePath);
    await uploadImageFromClipboard(filePath);
  } else if (typeof text !== "undefined") {
    await uploadImageFromClipboard(text);
  }
};
