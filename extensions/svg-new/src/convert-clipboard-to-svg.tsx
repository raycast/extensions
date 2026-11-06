import { Clipboard, open, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { creditsNote, saveNewFiles, showError, showProgress } from "./lib/command";
import { InputError, isSupportedImage, readImageAsDataUrl, unsupportedImageError } from "./lib/image";
import { svgText, vectorize } from "./lib/svgnew";

// Raycast's Clipboard API gives file paths, not image data, so screenshots and "Copy Image"
// are written to a temporary file from the pasteboard (PNG, or TIFF when there is no PNG).
const WRITE_PASTEBOARD_IMAGE = `
on run argv
  set outPath to item 1 of argv
  try
    set imageData to the clipboard as «class PNGf»
  on error
    try
      set imageData to the clipboard as «class TIFF»
      set outPath to item 2 of argv
    on error
      return ""
    end try
  end try
  set fileRef to open for access POSIX file outPath with write permission
  set eof of fileRef to 0
  write imageData to fileRef
  close access fileRef
  return outPath
end run
`;

/** The copied image as a file path, plus a temporary folder to delete afterwards. */
async function clipboardImage(): Promise<{ filePath: string; name: string; tempDir?: string }> {
  const { file } = await Clipboard.read();
  if (file) {
    const filePath = file.startsWith("file://") ? fileURLToPath(file) : file;
    if (!isSupportedImage(filePath)) throw unsupportedImageError();
    return { filePath, name: path.parse(filePath).name };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "svg-new-"));
  const written = await runAppleScript(WRITE_PASTEBOARD_IMAGE, [
    path.join(tempDir, "clipboard.png"),
    path.join(tempDir, "clipboard.tiff"),
  ]).catch(() => "");
  if (!written) {
    await fs.rm(tempDir, { recursive: true, force: true });
    throw new InputError("No image on the clipboard", "Copy an image or an image file first");
  }
  return { filePath: written, name: "Clipboard Image", tempDir };
}

export default async function Command() {
  let tempDir: string | undefined;
  try {
    const clipboard = await clipboardImage();
    tempDir = clipboard.tempDir;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Reading clipboard image…" });
    const image = await readImageAsDataUrl(clipboard.filePath);

    toast.title = "Vectorizing…";
    const result = await vectorize(image, { onProgress: showProgress(toast, "Vectorizing…") });

    toast.title = "Saving SVG…";
    toast.message = undefined;
    const svg = await svgText(result);
    const downloads = path.join(os.homedir(), "Downloads");
    const [outputPath] = await saveNewFiles(downloads, clipboard.name, [{ ext: ".svg", data: svg }]);
    await Clipboard.copy(svg);

    await showHUD(
      `Saved ${path.basename(outputPath)} to Downloads and copied the SVG${creditsNote(result.creditsRemaining)}`,
    );
    await open(outputPath);
  } catch (error) {
    await showError(error, "Could not convert image");
  } finally {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  }
}
