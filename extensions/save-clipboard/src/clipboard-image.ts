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
  const pasteboard = argv.length > 1
    ? $.NSPasteboard.pasteboardWithName(argv[1])
    : $.NSPasteboard.generalPasteboard;
  const type = pasteboard.availableTypeFromArray([
    "public.png", "public.tiff", "public.jpeg", "public.heic",
    "com.compuserve.gif", "org.webmproject.webp"
  ]);
  if (type.isNil()) return "";
  const data = pasteboard.dataForType(type);
  if (data.isNil()) return "";
  if (!data.writeToFileAtomically(argv[0], false)) {
    throw new Error("Could not write clipboard image to a temporary file");
  }
  return "image";
}
`;

export async function readClipboardImage(pasteboardName?: string): Promise<Buffer | undefined> {
  if (process.platform !== "darwin") return undefined;

  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "raycast-save-clipboard-"));
  try {
    const source = path.join(directory, "image");
    await fs.promises.writeFile(source, Buffer.alloc(0), { mode: 0o600 });
    const { stdout } = await execute("/usr/bin/osascript", [
      "-l",
      "JavaScript",
      "-e",
      READ_IMAGE,
      source,
      ...(pasteboardName ? [pasteboardName] : []),
    ]);
    return stdout.trim() === "image" ? await fs.promises.readFile(source) : undefined;
  } finally {
    await fs.promises.rm(directory, { recursive: true, force: true });
  }
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
