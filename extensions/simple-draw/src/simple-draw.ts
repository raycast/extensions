import { showToast, Toast, environment } from "@raycast/api";
import { execSync, spawn } from "child_process";
import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { generateDrawingPage } from "./drawing-page";

const SWIFT_CLIPBOARD_SCRIPT = `
import Cocoa
let pb = NSPasteboard.general
if let data = pb.data(forType: .png) {
    print(data.base64EncodedString())
} else if let data = pb.data(forType: .tiff) {
    if let bitmap = NSBitmapImageRep(data: data),
       let pngData = bitmap.representation(using: .png, properties: [:]) {
        print(pngData.base64EncodedString())
    } else { exit(1) }
} else { exit(1) }
`;

const VIEWER_BINARY = "/tmp/simple-draw-viewer";
const HTML_PATH = "/tmp/raycast-simple-draw.html";

function ensureViewerCompiled() {
  if (existsSync(VIEWER_BINARY)) return;

  const swiftSource = join(environment.assetsPath, "viewer.swift");
  execSync(
    `swiftc -framework Cocoa -framework WebKit -framework UniformTypeIdentifiers -O -o "${VIEWER_BINARY}" "${swiftSource}"`,
    { timeout: 60000 },
  );
}

export default async function Command() {
  let base64Image: string;

  try {
    base64Image = execSync(
      `/usr/bin/swift -e '${SWIFT_CLIPBOARD_SCRIPT.replace(/'/g, "'\\''")}'`,
      {
        timeout: 10000,
        maxBuffer: 50 * 1024 * 1024,
      },
    )
      .toString()
      .trim();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No image in clipboard",
      message: "Copy an image first, then try again",
    });
    return;
  }

  if (!base64Image) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No image in clipboard",
      message: "Copy an image first, then try again",
    });
    return;
  }

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Compiling viewer...",
    });
    ensureViewerCompiled();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to compile viewer",
      message: "Make sure Xcode Command Line Tools are installed",
    });
    return;
  }

  writeFileSync(HTML_PATH, generateDrawingPage(base64Image));

  const child = spawn(VIEWER_BINARY, [HTML_PATH], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  await showToast({
    style: Toast.Style.Success,
    title: "Simple Draw opened",
  });
}
