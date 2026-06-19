import path from "path";
import { execFile } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile, unlink } from "fs/promises";
import { promisify } from "util";
import { Clipboard, environment } from "@raycast/api";
import tempy from "tempy";

const execFileAsync = promisify(execFile);
const scriptFile = path.join(environment.supportPath, "copy-gif-as-square.swift");

const MACOS_SQUARE_GIF_SCRIPT = `
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never {
  FileHandle.standardError.write(Data((message + "\\n").utf8))
  exit(1)
}

guard CommandLine.arguments.count == 3 else {
  fail("Expected input and output paths")
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil) else {
  fail("Could not read GIF")
}

let frameCount = CGImageSourceGetCount(source)
guard frameCount > 0 else {
  fail("GIF has no frames")
}

guard
  let firstFrameProperties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
  let width = firstFrameProperties[kCGImagePropertyPixelWidth] as? Int,
  let height = firstFrameProperties[kCGImagePropertyPixelHeight] as? Int
else {
  fail("Could not read GIF dimensions")
}

let edgeLength = min(width, height)
let cropX = (width - edgeLength) / 2
let cropY = (height - edgeLength) / 2
let colorSpace = CGColorSpaceCreateDeviceRGB()
let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue
let gifType = UTType.gif.identifier as CFString

guard let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, gifType, frameCount, nil) else {
  fail("Could not create square GIF")
}

if
  let sourceProperties = CGImageSourceCopyProperties(source, nil) as? [CFString: Any],
  let sourceGifProperties = sourceProperties[kCGImagePropertyGIFDictionary] as? [CFString: Any],
  let loopCount = sourceGifProperties[kCGImagePropertyGIFLoopCount]
{
  CGImageDestinationSetProperties(destination, [
    kCGImagePropertyGIFDictionary: [
      kCGImagePropertyGIFLoopCount: loopCount
    ]
  ] as CFDictionary)
}

for frameIndex in 0..<frameCount {
  guard let frame = CGImageSourceCreateImageAtIndex(source, frameIndex, nil) else {
    fail("Could not read GIF frame \\(frameIndex)")
  }

  guard
    let context = CGContext(
      data: nil,
      width: edgeLength,
      height: edgeLength,
      bitsPerComponent: 8,
      bytesPerRow: 0,
      space: colorSpace,
      bitmapInfo: bitmapInfo
    )
  else {
    fail("Could not create square GIF frame \\(frameIndex)")
  }

  context.clear(CGRect(x: 0, y: 0, width: edgeLength, height: edgeLength))
  context.draw(frame, in: CGRect(x: -cropX, y: -cropY, width: width, height: height))

  guard let squareFrame = context.makeImage() else {
    fail("Could not render square GIF frame \\(frameIndex)")
  }

  var frameGifProperties: [CFString: Any] = [:]
  if
    let frameProperties = CGImageSourceCopyPropertiesAtIndex(source, frameIndex, nil) as? [CFString: Any],
    let sourceGifProperties = frameProperties[kCGImagePropertyGIFDictionary] as? [CFString: Any]
  {
    if let unclampedDelay = sourceGifProperties[kCGImagePropertyGIFUnclampedDelayTime] {
      frameGifProperties[kCGImagePropertyGIFUnclampedDelayTime] = unclampedDelay
    }
    if let delay = sourceGifProperties[kCGImagePropertyGIFDelayTime] {
      frameGifProperties[kCGImagePropertyGIFDelayTime] = delay
    }
  }

  CGImageDestinationAddImage(destination, squareFrame, [
    kCGImagePropertyGIFDictionary: frameGifProperties
  ] as CFDictionary)
}

guard CGImageDestinationFinalize(destination) else {
  fail("Could not write square GIF")
}
`;

export default async function copyGifAsSquareToClipboard(url: string, name: string) {
  if (process.platform !== "darwin") {
    throw new Error("Copy GIF as Square is only supported on macOS");
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`GIF file download failed. Server responded with ${response.status}`);
  }

  const squareGifName = name || path.basename(url);
  const inputFile = await tempy.write(Buffer.from(await response.arrayBuffer()), { extension: "gif" });
  const file = tempy.file({ name: squareGifName });

  try {
    await ensureScriptFile();
    await execFileAsync("/usr/bin/swift", [scriptFile, inputFile, file]);
    await Clipboard.copy({ file });
  } finally {
    await unlink(inputFile).catch(() => undefined);
  }

  return file;
}

async function ensureScriptFile() {
  if (!existsSync(environment.supportPath)) {
    mkdirSync(environment.supportPath, { recursive: true });
  }

  if (!existsSync(scriptFile) || (await readFile(scriptFile, "utf8")) !== MACOS_SQUARE_GIF_SCRIPT) {
    await writeFile(scriptFile, MACOS_SQUARE_GIF_SCRIPT);
  }
}
