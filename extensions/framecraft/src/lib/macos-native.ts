import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { statePaths } from "./env";

import { runCommand as execFileAsync } from "./command-runner";

const HELPER_VERSION = "v2";

const SWIFT_HELPER_SOURCE = `
import AppKit
import Foundation
import Vision

struct TextOverlayLayerSpec: Decodable {
    let text: String
    let fontFamily: String
    let fontSize: Double
    let fillHex: String
    let strokeHex: String
    let yOffset: Double
    let alignTop: Bool
}

struct RenderTextPayload: Decodable {
    let width: Int
    let height: Int
    let layers: [TextOverlayLayerSpec]
}

func colorFromHex(_ hex: String, fallback: NSColor) -> NSColor {
    let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    guard cleaned.count == 6, let val = UInt64(cleaned, radix: 16) else {
        return fallback
    }
    let r = CGFloat((val >> 16) & 0xFF) / 255.0
    let g = CGFloat((val >> 8) & 0xFF) / 255.0
    let b = CGFloat(val & 0xFF) / 255.0
    return NSColor(srgbRed: r, green: g, blue: b, alpha: 1.0)
}

func runOCR(imagePath: String) throws {
    let url = URL(fileURLWithPath: imagePath)
    let handler = VNImageRequestHandler(url: url, options: [:])
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en-US", "ja-JP"]

    try handler.perform([request])
    let observations = request.results ?? []
    // Sort top-to-bottom (Vision y=0 is bottom, y=1 is top)
    let sorted = observations.sorted { $0.boundingBox.midY > $1.boundingBox.midY }
    let lines = sorted.compactMap { $0.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
    let result = ["lines": lines, "text": lines.joined(separator: "\\n")] as [String: Any]
    let data = try JSONSerialization.data(withJSONObject: result, options: [])
    FileHandle.standardOutput.write(data)
}

func runRenderText(specPath: String, outPath: String) throws {
    let specData = try Data(contentsOf: URL(fileURLWithPath: specPath))
    let payload = try JSONDecoder().decode(RenderTextPayload.self, from: specData)
    let w = max(16, payload.width)
    let h = max(16, payload.height)

    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: w,
        pixelsHigh: h,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        exit(2)
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    paragraph.lineSpacing = 6

    for layer in payload.layers {
        let trimmed = layer.text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { continue }

        let fontSize = CGFloat(layer.fontSize)
        let font = NSFont(name: layer.fontFamily, size: fontSize)
            ?? NSFont.systemFont(ofSize: fontSize, weight: .semibold)
        let fillColor = colorFromHex(layer.fillHex, fallback: .white)
        let strokeColor = colorFromHex(layer.strokeHex, fallback: .black)

        let shadow = NSShadow()
        shadow.shadowColor = NSColor(calibratedWhite: 0.0, alpha: 0.82)
        shadow.shadowBlurRadius = max(4.0, fontSize * 0.14)
        shadow.shadowOffset = NSSize(width: 0, height: -max(2.0, fontSize * 0.05))

        let strokeAttrs: [NSAttributedString.Key: Any] = [
            .font: font,
            .paragraphStyle: paragraph,
            .strokeColor: strokeColor,
            .strokeWidth: max(4.0, fontSize * 0.14),
            .shadow: shadow
        ]
        let fillAttrs: [NSAttributedString.Key: Any] = [
            .font: font,
            .paragraphStyle: paragraph,
            .foregroundColor: fillColor
        ]

        let maxBoxWidth = CGFloat(w) * 0.86
        let strokeStr = NSAttributedString(string: trimmed, attributes: strokeAttrs)
        let fillStr = NSAttributedString(string: trimmed, attributes: fillAttrs)
        let bounds = fillStr.boundingRect(
            with: NSSize(width: maxBoxWidth, height: CGFloat(h) * 0.5),
            options: [.usesLineFragmentOrigin, .usesFontLeading]
        )

        let margin = CGFloat(h) * 0.065
        // Note: AppKit flipped=false -> y=0 is bottom!
        let baseBottomY: CGFloat
        if layer.alignTop {
            baseBottomY = CGFloat(h) - margin - ceil(bounds.height) - CGFloat(layer.yOffset)
        } else {
            baseBottomY = margin - CGFloat(layer.yOffset)
        }

        let drawRect = NSRect(
            x: (CGFloat(w) - maxBoxWidth) / 2.0,
            y: baseBottomY,
            width: maxBoxWidth,
            height: ceil(bounds.height) + fontSize * 0.35
        )
        strokeStr.draw(with: drawRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
        fillStr.draw(with: drawRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
    }

    NSGraphicsContext.restoreGraphicsState()
    guard let pngData = rep.representation(using: .png, properties: [:]) else {
        exit(3)
    }
    try pngData.write(to: URL(fileURLWithPath: outPath))
}

func runCopyImage(imagePath: String) throws {
    let url = URL(fileURLWithPath: imagePath)
    let data = try Data(contentsOf: url)
    let pb = NSPasteboard.general
    pb.clearContents()
    pb.setData(data, forType: .png)
}

let args = CommandLine.arguments
guard args.count >= 3 else {
    exit(1)
}

do {
    switch args[1] {
    case "ocr":
        try runOCR(imagePath: args[2])
    case "render-text":
        guard args.count >= 4 else { exit(1) }
        try runRenderText(specPath: args[2], outPath: args[3])
    case "copy-image":
        try runCopyImage(imagePath: args[2])
    default:
        exit(1)
    }
} catch {
    fputs("\\(error)\\n", stderr)
    exit(1)
}
`;

export async function ensureNativeHelper(supportPath: string): Promise<string | null> {
  const { binCacheDir } = statePaths(supportPath);
  fs.mkdirSync(binCacheDir, { recursive: true });

  const binPath = path.join(binCacheDir, `framecraft-macos-helper-${HELPER_VERSION}`);
  if (fs.existsSync(binPath)) {
    return binPath;
  }

  const srcPath = path.join(binCacheDir, `framecraft-macos-helper-${HELPER_VERSION}.swift`);
  const tmpModuleCache = path.join(binCacheDir, "swift-module-cache");
  fs.mkdirSync(tmpModuleCache, { recursive: true });
  fs.writeFileSync(srcPath, SWIFT_HELPER_SOURCE, "utf-8");

  try {
    await execFileAsync("/usr/bin/swiftc", ["-O", "-module-cache-path", tmpModuleCache, srcPath, "-o", binPath], {
      env: { ...process.env, TMPDIR: binCacheDir },
      timeout: 45_000,
    });
    return fs.existsSync(binPath) ? binPath : null;
  } catch {
    return null;
  }
}

export interface TextOverlayLayerInput {
  text: string;
  fontFamily: string;
  fontSize: number;
  fillHex: string;
  strokeHex: string;
  yOffset: number;
  alignTop: boolean;
}

export async function renderTransparentTextOverlayPng(
  supportPath: string,
  width: number,
  height: number,
  layers: TextOverlayLayerInput[],
  outPngPath: string,
): Promise<boolean> {
  const helper = await ensureNativeHelper(supportPath);
  if (!helper) return false;

  const specPath = `${outPngPath}.spec.json`;
  fs.writeFileSync(specPath, JSON.stringify({ width, height, layers }), "utf-8");
  try {
    await execFileAsync(helper, ["render-text", specPath, outPngPath], { timeout: 10_000 });
    return fs.existsSync(outPngPath);
  } catch {
    return false;
  } finally {
    fs.rmSync(specPath, { force: true });
  }
}

export async function recognizeSubtitleBitmapOcr(supportPath: string, bitmapPngPath: string): Promise<string | null> {
  const helper = await ensureNativeHelper(supportPath);
  if (!helper || !fs.existsSync(bitmapPngPath)) return null;

  try {
    const { stdout } = await execFileAsync(helper, ["ocr", bitmapPngPath], {
      timeout: 15_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout) as { text?: string };
    return (parsed.text ?? "").trim() || null;
  } catch {
    return null;
  }
}

export async function copyPngToClipboard(supportPath: string, pngPath: string): Promise<void> {
  if (!fs.existsSync(pngPath)) return;

  const helper = await ensureNativeHelper(supportPath);
  if (helper) {
    try {
      await execFileAsync(helper, ["copy-image", pngPath], { timeout: 5000 });
      return;
    } catch {
      // Fall through to AppleScript
    }
  }

  const escaped = pngPath.replace(/"/g, '\\"');
  await execFileAsync(
    "/usr/bin/osascript",
    ["-e", `set the clipboard to (read (POSIX file "${escaped}") as «class PNGf»)`],
    { timeout: 5000 },
  ).catch(() => undefined);
}

export function playCompletionChime(): void {
  try {
    const child = spawn("/usr/bin/afplay", ["/System/Library/Sounds/Glass.aiff"], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Ignore audio errors
  }
}

export function postMacNotification(title: string, message: string): void {
  const safeTitle = title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const safeMsg = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " · ");
  try {
    const child = spawn("/usr/bin/osascript", ["-e", `display notification "${safeMsg}" with title "${safeTitle}"`], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Ignore notification errors
  }
}
