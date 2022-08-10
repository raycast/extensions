import { Clipboard, showToast } from "@raycast/api";
import lzstring from "lz-string";
import err from "./err";

export default async () => {
  const text = await Clipboard.readText();
  if (!text) return err("Clipboard empty");

  try {
    const decompressed = lzstring.decompressFromBase64(text);

    if (!decompressed) return err("Failed to decompress");

    Clipboard.copy(decompressed);
    showToast({
      title: "🎉 Copied to clipboard",
    });
  } catch {
    err("An error ocurred");
  }
};
