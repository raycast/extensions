import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import fetch from "node-fetch";

export const fetchAndCopySvg = async (url: string) => {
  const res = await fetch(url);
  const svg = await res.text();

  Clipboard.copy(svg);
  showHUD("Copied SVG to clipboard");
  closeMainWindow();
};
