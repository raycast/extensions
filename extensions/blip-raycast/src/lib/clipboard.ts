/**
 * Reads the system clipboard in the richest form available: copied files, else text, else an image.
 * Raycast's Clipboard API returns at most one file and no image data, so we ask the OS directly.
 */
import { runAppleScript, runPowerShellScript } from "@raycast/utils";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { newId } from "./actions";
import type { SendContent } from "./content";
import { isMac, isWindows } from "./endpoint";
import { markStaged, stagingDir } from "./outbox";

type ClipboardContent =
  | { kind: "files"; paths: string[] }
  | { kind: "text"; text: string; concealed?: boolean }
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
  // Copying an image in a browser also puts its URL on the clipboard; anything else with text
  // (e.g. a spreadsheet cell, which comes with a picture of itself) is sent as text.
  const textLooksLikeImageLink = hasText && /^(https?|file):\\/\\/\\S+$/i.test(ObjC.unwrap(text).trim());
  if (!image.isNil() && (!hasText || textLooksLikeImageLink)) {
    image.writeToFileAtomically(imagePath, true);
    return JSON.stringify({ kind: 'image', path: imagePath });
  }
  if (hasText) {
    // Password managers mark secrets as concealed (the nspasteboard.org convention).
    const types = pb.types.isNil() ? [] : ObjC.deepUnwrap(pb.types);
    const concealed = types.indexOf('org.nspasteboard.ConcealedType') >= 0;
    return JSON.stringify({ kind: 'text', text: ObjC.unwrap(text), concealed });
  }
  return JSON.stringify({ kind: 'empty' });
}`;

// The image path is embedded as Base64, so no character in it can break out of the script.
const WINDOWS_SCRIPT = (imagePathBase64: string) => `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$imagePath = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${imagePathBase64}'))
$cb = [System.Windows.Forms.Clipboard]
if ($cb::ContainsFileDropList()) {
  $paths = @($cb::GetFileDropList() | ForEach-Object { $_ })
  @{ kind = 'files'; paths = $paths } | ConvertTo-Json -Compress
} elseif ($cb::ContainsText() -and $cb::GetText().Trim().Length -gt 0) {
  # Password managers mark secrets with this format so clipboard tools don't show them.
  $concealed = $cb::ContainsData('ExcludeClipboardContentFromMonitorProcessing')
  @{ kind = 'text'; text = $cb::GetText(); concealed = $concealed } | ConvertTo-Json -Compress
} elseif ($cb::ContainsImage()) {
  $cb::GetImage().Save($imagePath, [System.Drawing.Imaging.ImageFormat]::Png)
  @{ kind = 'image'; path = $imagePath } | ConvertTo-Json -Compress
} else {
  @{ kind = 'empty' } | ConvertTo-Json -Compress
}`;

function imageFileName() {
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+$/, "");
  return `Clipboard Image ${stamp}.png`;
}

const SCRIPT_TIMEOUT_MS = 15000;

/** `scratchDir` receives the PNG when the clipboard holds an image. */
async function readClipboard(scratchDir: string): Promise<ClipboardContent> {
  // Each read gets its own folder, so two images copied within the same second never collide.
  const imagePath = join(scratchDir, newId(), imageFileName());
  mkdirSync(dirname(imagePath), { recursive: true });
  let stdout: string;
  if (isMac) {
    stdout = await runAppleScript(MAC_SCRIPT, [imagePath], { language: "JavaScript", timeout: SCRIPT_TIMEOUT_MS });
  } else if (isWindows) {
    const script = WINDOWS_SCRIPT(Buffer.from(imagePath, "utf8").toString("base64"));
    // The script is read from stdin, where PowerShell only runs a multi-line block once a blank line follows it.
    stdout = await runPowerShellScript(`${script}\n\n`, { timeout: SCRIPT_TIMEOUT_MS });
  } else {
    throw new Error("Reading the clipboard isn't supported on this platform.");
  }
  const parsed = JSON.parse(stdout.trim()) as ClipboardContent;
  if (parsed.kind === "files") {
    // PowerShell serializes a single-item array as a string.
    const paths = (parsed as { paths: string[] | string }).paths;
    return { kind: "files", paths: Array.isArray(paths) ? paths : [paths] };
  }
  return parsed;
}

/**
 * Reads the clipboard now so the user can see it before choosing a recipient.
 * Returns undefined for an empty clipboard; throws if the clipboard can't be read.
 */
export async function readClipboardContent(supportPath: string): Promise<SendContent | undefined> {
  let clip: ClipboardContent;
  try {
    clip = await readClipboard(stagingDir(supportPath));
  } catch {
    throw new Error("The clipboard couldn't be read. Copy it again and retry.");
  }
  const source = "Clipboard";
  switch (clip.kind) {
    case "files":
      return clip.paths.length ? { kind: "files", paths: clip.paths, source } : undefined;
    case "text":
      return { kind: "text", text: clip.text, concealed: Boolean(clip.concealed), source };
    case "image":
      markStaged(clip.path);
      return { kind: "image", path: clip.path, source };
    case "empty":
      return undefined;
  }
}
