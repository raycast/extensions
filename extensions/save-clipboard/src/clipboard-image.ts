import { execFile, execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execute = promisify(execFile);

// Clipboard.read() exposes file paths, but screenshots can contain only image data.
const READ_IMAGE = `
ObjC.import("AppKit");
function run(argv) {
  const pasteboard = argv.length
    ? $.NSPasteboard.pasteboardWithName(argv[0])
    : $.NSPasteboard.generalPasteboard;
  const type = pasteboard.availableTypeFromArray([
    "public.png", "public.tiff", "public.jpeg", "public.heic",
    "com.compuserve.gif", "org.webmproject.webp"
  ]);
  if (type.isNil()) return "";
  const data = pasteboard.dataForType(type);
  if (data.isNil()) return "";
  return ObjC.unwrap(data.base64EncodedStringWithOptions(0));
}
`;

export async function readClipboardImage(pasteboardName?: string): Promise<Buffer | undefined> {
  if (process.platform !== "darwin") return undefined;

  const { stdout } = await execute(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", READ_IMAGE, ...(pasteboardName ? [pasteboardName] : [])],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const encoded = stdout.trim();
  return encoded ? Buffer.from(encoded, "base64") : undefined;
}

export function saveClipboardImageAsJpeg(data: Buffer, destination: string): void {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "raycast-save-clipboard-"));
  try {
    const source = path.join(directory, "image");
    fs.writeFileSync(source, data);
    execFileSync("/usr/bin/sips", ["--setProperty", "format", "jpeg", source, "--out", destination], {
      stdio: "ignore",
    });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
