import { Clipboard, showToast } from "@raycast/api";
import lzstring from "lz-string";
import err from "./err";

export default async () => {
  const text = await Clipboard.readText();
  if (!text) return err("Clipboard empty");

  try {
    const compressed = lzstring.compressToBase64(text);

    Clipboard.copy(compressed);
    showToast({
      title: "🎉 Copied to clipboard",
    });
  } catch {
    err("An error ocurred");
  }
};
