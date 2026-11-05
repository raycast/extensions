import { Clipboard, environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const clipboardDirectory = join(environment.supportPath, "draft-images");

// Screenshots and copied browser images may contain pixels without a file URL.
const READ_MAC_IMAGE = `
ObjC.import("AppKit");
function run(argv) {
  const pasteboard = $.NSPasteboard.generalPasteboard;
  const png = pasteboard.dataForType("public.png");
  if (!png.isNil()) {
    if (!png.writeToFileAtomically(argv[0], true)) throw new Error("Could not save clipboard image");
    return "image";
  }
  const image = $.NSImage.alloc.initWithPasteboard(pasteboard);
  if (image.isNil()) return "";
  const bitmap = $.NSBitmapImageRep.imageRepWithData(image.TIFFRepresentation);
  if (bitmap.isNil()) return "";
  const data = bitmap.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $({}));
  if (data.isNil() || !data.writeToFileAtomically(argv[0], true)) {
    throw new Error("Could not save clipboard image");
  }
  return "image";
}
`;

const READ_WINDOWS_IMAGE = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
  $image = [System.Windows.Forms.Clipboard]::GetImage()
  try {
    $image.Save($env:TYPEFULLY_CLIPBOARD_IMAGE_PATH, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output 'image'
  } finally {
    $image.Dispose()
  }
}
`;

export async function validateImageFiles(paths: string[]) {
  if (paths.length > 4) throw new Error("Attach up to 4 images per draft.");
  for (const path of paths) {
    if (!IMAGE_EXTENSIONS.has(extname(path).toLowerCase())) {
      throw new Error("Choose PNG, JPEG, WebP, or GIF images.");
    }
    const file = await stat(path).catch(() => undefined);
    if (!file?.isFile() || file.size === 0) {
      throw new Error("An attached image is empty or unavailable. Remove it and attach it again.");
    }
  }
}

export async function readClipboardImage(): Promise<string> {
  await mkdir(clipboardDirectory, { recursive: true, mode: 0o700 });
  const { file } = await Clipboard.read();
  let destination = join(clipboardDirectory, `${randomUUID()}.png`);

  try {
    if (file) {
      const source = file.startsWith("file://") ? fileURLToPath(file) : file;
      await validateImageFiles([source]);
      destination = join(clipboardDirectory, `${randomUUID()}${extname(source).toLowerCase()}`);
      // Keep a snapshot even if the original file is moved or deleted later.
      await copyFile(source, destination);
    } else {
      let stdout = "";
      if (process.platform === "darwin") {
        ({ stdout } = await execute("/usr/bin/osascript", ["-l", "JavaScript", "-e", READ_MAC_IMAGE, destination], {
          timeout: 10_000,
        }));
      } else if (process.platform === "win32") {
        ({ stdout } = await execute(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-STA",
            "-EncodedCommand",
            Buffer.from(READ_WINDOWS_IMAGE, "utf16le").toString("base64"),
          ],
          { timeout: 10_000, env: { ...process.env, TYPEFULLY_CLIPBOARD_IMAGE_PATH: destination } },
        ));
      }
      if (stdout.trim() !== "image") throw new Error("Copy an image or image file, then try again.");
    }
    await validateImageFiles([destination]);
    return destination;
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  }
}

export async function removeClipboardImages(paths: string[]) {
  // Never delete files selected from the user's own folders.
  await Promise.all(
    paths
      .filter((path) => dirname(resolve(path)) === resolve(clipboardDirectory))
      .map((path) => rm(path, { force: true }).catch(() => {})),
  );
}
