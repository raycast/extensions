import { Clipboard, type Tool } from "@raycast/api";
import { pathToFileURL } from "node:url";
import { previewPath } from "../lib/ai";
import { exportPng } from "../lib/files";
import { exportDirectory } from "../lib/settings";

type Input = {
  /** Exact previewId returned by a rendering/comparison tool, including a contact sheet. Never a file path. */
  previewId: string;
  /** Copy the PNG to the clipboard or save a unique file in the configured export directory (Downloads by default). */
  action: "copy" | "save";
};

export const confirmation: Tool.Confirmation<Input> = async ({ previewId, action }) => {
  const path = await previewPath(previewId);
  if (action !== "copy" && action !== "save") throw new Error("Choose copy or save.");
  return {
    message: action === "copy" ? "Copy this PNG to the clipboard?" : "Save this PNG to the export directory?",
    info: [
      { name: "Preview", value: path },
      { name: "Destination", value: action === "copy" ? "Clipboard" : exportDirectory() },
    ],
  };
};

/** Copy or save an already generated PNG. Run only when the user asks to copy or export it. */
export default async function exportPreview({ previewId, action }: Input) {
  const path = await previewPath(previewId);
  if (action === "copy") {
    await Clipboard.copy({ file: path });
    return { copied: true, previewId };
  }
  if (action !== "save") throw new Error("Choose copy or save.");
  const destination = await exportPng(path, exportDirectory());
  return { saved: true, pngPath: destination, fileUrl: pathToFileURL(destination).href };
}
