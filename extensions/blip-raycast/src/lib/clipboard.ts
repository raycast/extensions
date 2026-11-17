/**
 * Reads the system clipboard in the richest form available: copied files, else text, else an image.
 * Raycast's Clipboard API returns at most one file and no image data, so we ask the OS directly.
 */
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { isMac, isWindows } from "./endpoint";

const execFileAsync = promisify(execFile);

export type ClipboardContent =
  | { kind: "files"; paths: string[] }
  | { kind: "text"; text: string }
  | { kind: "image"; path: string }
  | { kind: "empty" };

const MAC_SCRIPT = `
ObjC.import('AppKit');
function run(argv) {
  const imagePath = argv[0];
  const pb = $.NSPasteboard.generalPasteboard;
  const opts = $.NSDictionary.dictionaryWithObjectForKey($.NSNumber.numberWithBool(true), $.NSPasteboardURLReadingFileURLsOnlyKey);
  const urls = pb.readObjectsForClassesOptions($.NSArray.arrayWithObject($.NSURL), opts);
  if (!urls.isNil() && urls.count > 0) {
    const paths = [];
    for (let i = 0; i < urls.count; i++) paths.push(ObjC.unwrap(urls.objectAtIndex(i).path));
    return JSON.stringify({ kind: 'files', paths });
  }
  const text = pb.stringForType($.NSPasteboardTypeString);
  const hasText = !text.isNil() && ObjC.unwrap(text).trim().length > 0;
  let image = pb.dataForType($.NSPasteboardTypePNG);
  if (image.isNil()) {
    const tiff = pb.dataForType($.NSPasteboardTypeTIFF);
    if (!tiff.isNil()) {
      const rep = $.NSBitmapImageRep.imageRepWithData(tiff);
      if (!rep.isNil()) image = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $.NSDictionary.dictionary);
    }
  }
  const textLooksLikeImageLink = hasText && /^\\S+$/.test(ObjC.unwrap(text).trim());
  if (!image.isNil() && (!hasText || textLooksLikeImageLink)) {
    image.writeToFileAtomically(imagePath, true);
    return JSON.stringify({ kind: 'image', path: imagePath });
  }
  if (hasText) return JSON.stringify({ kind: 'text', text: ObjC.unwrap(text) });
  return JSON.stringify({ kind: 'empty' });
}`;

const WINDOWS_SCRIPT = (imagePath: string) => `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$cb = [System.Windows.Forms.Clipboard]
if ($cb::ContainsFileDropList()) {
  $paths = @($cb::GetFileDropList() | ForEach-Object { $_ })
  @{ kind = 'files'; paths = $paths } | ConvertTo-Json -Compress
} elseif ($cb::ContainsText() -and $cb::GetText().Trim().Length -gt 0) {
  @{ kind = 'text'; text = $cb::GetText() } | ConvertTo-Json -Compress
} elseif ($cb::ContainsImage()) {
  $cb::GetImage().Save('${imagePath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
  @{ kind = 'image'; path = '${imagePath.replace(/'/g, "''")}' } | ConvertTo-Json -Compress
} else {
  @{ kind = 'empty' } | ConvertTo-Json -Compress
}`;

function imageFileName() {
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+$/, "");
  return `Clipboard Image ${stamp}.png`;
}

/** `scratchDir` receives the PNG when the clipboard holds an image. */
export async function readClipboard(scratchDir: string): Promise<ClipboardContent> {
  const imagePath = join(scratchDir, imageFileName());
  let stdout: string;
  if (isMac) {
    ({ stdout } = await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", MAC_SCRIPT, imagePath], {
      maxBuffer: 64 * 1024 * 1024,
    }));
  } else if (isWindows) {
    ({ stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-STA", "-Command", WINDOWS_SCRIPT(imagePath)],
      { maxBuffer: 64 * 1024 * 1024, timeout: 15000 },
    ));
  } else {
    throw new Error("Clipboard reading isn't supported on this platform.");
  }
  const parsed = JSON.parse(stdout.trim()) as ClipboardContent;
  if (parsed.kind === "files") {
    // PowerShell serialises a single-item array as a string.
    const paths = (parsed as { paths: string[] | string }).paths;
    return { kind: "files", paths: Array.isArray(paths) ? paths : [paths] };
  }
  return parsed;
}
