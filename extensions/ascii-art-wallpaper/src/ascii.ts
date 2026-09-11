import { createHash } from "crypto";
import fs from "fs";
import { execFile } from "./exec-file-async";
import path from "path";
import { environment } from "@raycast/api";

// Character ramp: 16 levels, each visually distinct in density
const ASCII_CHARS = " .',:;clodxkO0KX@";

let _cachedScreen: { width: number; height: number } | null = null;

export async function getScreenResolution(): Promise<{
  width: number;
  height: number;
}> {
  if (_cachedScreen) return _cachedScreen;
  try {
    // Use NSScreen via JXA to get the actual backing pixel resolution
    const { stdout } = await execFile(
      "osascript",
      [
        "-l",
        "JavaScript",
        "-e",
        'ObjC.import("AppKit");' +
          "var screens = $.NSScreen.screens;" +
          "var best = {w:0,h:0};" +
          "for(var i=0;i<screens.count;i++){" +
          "var s=screens.objectAtIndex(i);" +
          "var f=s.frame;" +
          "var sf=s.backingScaleFactor;" +
          "var w=f.size.width*sf;" +
          "var h=f.size.height*sf;" +
          "if(w*h>best.w*best.h){best={w:w,h:h};}}" +
          "JSON.stringify(best);",
      ],
      { stdio: ["pipe", "pipe", "ignore"], timeout: 5000 },
    );
    const json = stdout.toString().trim();
    const parsed = JSON.parse(json);
    if (parsed.w > 0 && parsed.h > 0) {
      _cachedScreen = { width: parsed.w, height: parsed.h };
    }
  } catch {
    /* fallback below */
  }
  if (!_cachedScreen) {
    _cachedScreen = { width: 3840, height: 2160 };
  }
  return _cachedScreen;
}

export interface RGBPixel {
  r: number;
  g: number;
  b: number;
}

function tmpPath(name: string): string {
  const dir = environment.supportPath;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

async function getPixels(
  imageBuffer: Buffer,
  cols: number,
  rows: number,
  screenW = 3840,
  screenH = 2160,
): Promise<RGBPixel[][]> {
  const jpgPath = tmpPath("input.jpg");
  const bmpPath = tmpPath("input.bmp");

  fs.writeFileSync(jpgPath, imageBuffer);

  // Get source image dimensions
  const { stdout: infoBuf } = await execFile("sips", ["-g", "pixelWidth", "-g", "pixelHeight", jpgPath], {
    stdio: ["pipe", "pipe", "ignore"],
  });
  const info = infoBuf.toString();
  const wMatch = info.match(/pixelWidth:\s*(\d+)/);
  const hMatch = info.match(/pixelHeight:\s*(\d+)/);
  const imgW = wMatch ? parseInt(wMatch[1]) : screenW;
  const imgH = hMatch ? parseInt(hMatch[1]) : screenH;

  // Cover mode: resize to cover screen resolution while preserving aspect ratio
  const scaleW = screenW / imgW;
  const scaleH = screenH / imgH;
  const scale = Math.max(scaleW, scaleH);
  const coverW = Math.ceil(imgW * scale);
  const coverH = Math.ceil(imgH * scale);

  await execFile("sips", ["-z", String(coverH), String(coverW), "-s", "format", "bmp", jpgPath, "--out", bmpPath], {
    stdio: ["pipe", "pipe", "ignore"],
  });

  const bmp = fs.readFileSync(bmpPath);

  const dataOffset = bmp.readUInt32LE(10);
  const width = bmp.readInt32LE(18);
  const rawHeight = bmp.readInt32LE(22);
  const height = Math.abs(rawHeight);
  const topDown = rawHeight < 0;
  const bitsPerPixel = bmp.readUInt16LE(28);
  const bytesPerPixel = bitsPerPixel / 8;
  const rowSize = Math.ceil((width * bytesPerPixel) / 4) * 4;

  // Center-crop offsets to screen resolution
  const cropOffsetX = Math.max(0, Math.floor((width - screenW) / 2));
  const cropOffsetY = Math.max(0, Math.floor((height - screenH) / 2));

  // Cell dimensions in screen pixels
  const cellW = screenW / cols;
  const cellH = screenH / rows;

  const grid: RGBPixel[][] = [];
  for (let i = 0; i < rows; i++) {
    // Sample at the center of each cell in screen space
    const screenY = Math.floor(i * cellH + cellH / 2);
    const rawSrcRow = topDown ? cropOffsetY + screenY : height - 1 - (cropOffsetY + screenY);
    const srcRow = Math.max(0, Math.min(height - 1, rawSrcRow));
    const row: RGBPixel[] = [];
    for (let j = 0; j < cols; j++) {
      const screenX = Math.floor(j * cellW + cellW / 2);
      const srcCol = Math.max(0, Math.min(width - 1, cropOffsetX + screenX));
      const offset = dataOffset + srcRow * rowSize + srcCol * bytesPerPixel;
      if (offset + 2 < bmp.length) {
        row.push({ r: bmp[offset + 2], g: bmp[offset + 1], b: bmp[offset] });
      } else {
        row.push({ r: 0, g: 0, b: 0 });
      }
    }
    grid.push(row);
  }

  try {
    fs.unlinkSync(jpgPath);
    fs.unlinkSync(bmpPath);
  } catch {
    /* ignore */
  }

  return grid;
}

function brightness(p: RGBPixel): number {
  return 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;
}

// Menlo advance width = fontSize * ADVANCE_RATIO (measured from actual font metrics)
const ADVANCE_RATIO = 0.6;
const LINE_HEIGHT_RATIO = 1.2;

/**
 * Compute the exact grid dimensions that will fill the screen.
 * The Swift renderer uses actual font metrics to force-fill,
 * so we match the grid to those dimensions.
 */
export function computeFillRows(cols: number, screenW = 3840, screenH = 2160): number {
  const fontSize = screenW / (cols * ADVANCE_RATIO);
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  return Math.ceil(screenH / lineHeight);
}

export async function imageToAscii(
  imageBuffer: Buffer,
  cols: number,
  forceRows?: number,
  screenW = 3840,
  screenH = 2160,
): Promise<{ ascii: string; colorGrid: RGBPixel[][] }> {
  let rows: number;
  if (forceRows) {
    rows = forceRows;
  } else {
    const jpgPath = tmpPath("dim.jpg");
    fs.writeFileSync(jpgPath, imageBuffer);
    const { stdout: dimInfoBuf } = await execFile("sips", ["-g", "pixelWidth", "-g", "pixelHeight", jpgPath], {
      stdio: ["pipe", "pipe", "ignore"],
    });
    try {
      fs.unlinkSync(jpgPath);
    } catch {
      /* ignore */
    }
    const dimInfo = dimInfoBuf.toString();
    const wMatch = dimInfo.match(/pixelWidth:\s*(\d+)/);
    const hMatch = dimInfo.match(/pixelHeight:\s*(\d+)/);
    const imgW = wMatch ? parseInt(wMatch[1]) : 800;
    const imgH = hMatch ? parseInt(hMatch[1]) : 600;
    rows = Math.floor(cols * (imgH / imgW) * 0.5);
  }

  const pixels = await getPixels(imageBuffer, cols, rows, screenW, screenH);

  // Use 2nd/98th percentile for robustness against outliers
  const allBright: number[] = [];
  for (const row of pixels) {
    for (const pixel of row) {
      allBright.push(brightness(pixel));
    }
  }
  allBright.sort((a, b) => a - b);
  const lo = allBright[Math.floor(allBright.length * 0.02)];
  const hi = allBright[Math.floor(allBright.length * 0.98)];
  const range = hi - lo || 1;

  const lines: string[] = [];
  for (const row of pixels) {
    let line = "";
    for (const pixel of row) {
      const b = brightness(pixel);
      // Normalize to 0-1 using image's own range
      const normalized = Math.max(0, Math.min(1, (b - lo) / range));
      // Mild gamma to boost midtones
      const corrected = Math.pow(normalized, 0.8);
      const charIndex = Math.min(ASCII_CHARS.length - 1, Math.floor(corrected * ASCII_CHARS.length));
      line += ASCII_CHARS[charIndex];
    }
    lines.push(line);
  }

  return { ascii: lines.join("\n"), colorGrid: pixels };
}

// Swift renderer: uses real font metrics, force-fills entire screen
const SWIFT_SOURCE = `
import AppKit
import CoreText

let args = CommandLine.arguments
guard args.count >= 6 else { exit(1) }

let textPath = args[1]
let colorMapPath = args[2]
let bgHex = args[3]
let fgHex = args[4]
let outputPath = args[5]
let W = args.count > 6 ? Int(args[6]) ?? 3840 : 3840
let H = args.count > 7 ? Int(args[7]) ?? 2160 : 2160

func hex(_ s: String) -> NSColor {
    let h = s.hasPrefix("#") ? String(s.dropFirst()) : s
    let scanner = Scanner(string: h)
    var rgb: UInt64 = 0
    scanner.scanHexInt64(&rgb)
    return NSColor(
        red: CGFloat((rgb >> 16) & 0xFF) / 255.0,
        green: CGFloat((rgb >> 8) & 0xFF) / 255.0,
        blue: CGFloat(rgb & 0xFF) / 255.0,
        alpha: 1.0
    )
}

let text = try! String(contentsOfFile: textPath, encoding: .utf8)
let lines = text.components(separatedBy: "\\n").filter { !$0.isEmpty }
let maxLen = lines.map { $0.count }.max() ?? 1
let lineCount = lines.count

// Load color map
var colorMap: Data? = nil
if colorMapPath != "mono" {
    colorMap = try? Data(contentsOf: URL(fileURLWithPath: colorMapPath))
}

// Measure actual Menlo advance width at a reference size
let refSize: CGFloat = 100.0
let refFont = NSFont(name: "Menlo-Regular", size: refSize)!
let refStr = NSAttributedString(string: "M", attributes: [.font: refFont])
let advanceRatio = refStr.size().width / refSize

// Calculate fontSize to fill width exactly
let fontSize = CGFloat(W) / (CGFloat(maxLen) * advanceRatio)
let font = NSFont(name: "Menlo-Regular", size: fontSize)!

// Force cell dimensions to fill the screen exactly
let cellW = CGFloat(W) / CGFloat(maxLen)
let cellH = CGFloat(H) / CGFloat(lineCount)

let bgColor = hex(bgHex)
let fgColor = hex(fgHex)

let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: W * 4, bitsPerPixel: 32
)!
let ctx = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = ctx

// Fill background
bgColor.setFill()
NSRect(x: 0, y: 0, width: W, height: H).fill()

// Vertical offset to center character within cell
let baselineOffset = font.descender

for (i, line) in lines.enumerated() {
    // Force Y position: each row takes exactly cellH pixels
    let rowTop = CGFloat(i) * cellH
    // AppKit Y is flipped (0 = bottom)
    let y = CGFloat(H) - rowTop - cellH - baselineOffset

    if let cm = colorMap {
        for (j, char) in line.enumerated() {
            if char == " " { continue }
            let colorOffset = (i * maxLen + j) * 3
            var charColor = fgColor
            if colorOffset + 2 < cm.count {
                charColor = NSColor(
                    red: CGFloat(cm[colorOffset]) / 255.0,
                    green: CGFloat(cm[colorOffset + 1]) / 255.0,
                    blue: CGFloat(cm[colorOffset + 2]) / 255.0,
                    alpha: 1.0
                )
            }
            let x = CGFloat(j) * cellW
            let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: charColor]
            NSAttributedString(string: String(char), attributes: attrs).draw(at: NSPoint(x: x, y: y))
        }
    } else {
        let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: fgColor]
        for (j, char) in line.enumerated() {
            if char == " " { continue }
            let x = CGFloat(j) * cellW
            NSAttributedString(string: String(char), attributes: attrs).draw(at: NSPoint(x: x, y: y))
        }
    }
}

NSGraphicsContext.current = nil
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try! png.write(to: URL(fileURLWithPath: outputPath))
`;

function swiftSourceContentHash(): string {
  return createHash("sha256").update(SWIFT_SOURCE).digest("hex");
}

async function getRendererBinary(): Promise<string> {
  const binPath = tmpPath("ascii-renderer");
  const srcPath = tmpPath("ascii-renderer.swift");

  const srcHash = tmpPath("ascii-renderer.hash");
  const currentHash = swiftSourceContentHash();
  const existingHash = fs.existsSync(srcHash) ? fs.readFileSync(srcHash, "utf-8") : "";
  if (!fs.existsSync(binPath) || currentHash !== existingHash) {
    fs.writeFileSync(srcPath, SWIFT_SOURCE);
    await execFile("swiftc", ["-O", "-o", binPath, srcPath], {
      stdio: ["pipe", "pipe", "ignore"],
    });
    fs.writeFileSync(srcHash, currentHash);
    try {
      fs.unlinkSync(srcPath);
    } catch {
      /* ignore */
    }
  }

  return binPath;
}

export async function generateWallpaper(
  asciiText: string,
  colorGrid: RGBPixel[][],
  options: {
    backgroundColor: string;
    textColor: string;
    colorMode: string;
    width?: number;
    height?: number;
  },
): Promise<string> {
  const renderer = await getRendererBinary();
  const textPath = tmpPath("ascii-text.txt");
  // Clean up old wallpapers
  const dir = environment.supportPath;
  try {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith("ascii-wallpaper-") && f.endsWith(".png")) {
        fs.unlinkSync(path.join(dir, f));
      }
    }
  } catch {
    /* ignore */
  }
  // Unique filename so macOS detects the change
  const outputPath = tmpPath(`ascii-wallpaper-${Date.now()}.png`);
  const W = options.width || 3840;
  const H = options.height || 2160;

  fs.writeFileSync(textPath, asciiText);

  let colorMapArg = "mono";

  if (options.colorMode === "color" && colorGrid.length > 0) {
    const lines = asciiText.split("\n");
    const maxLen = Math.max(...lines.map((l) => l.length));
    const colorMapPath = tmpPath("colormap.bin");
    const buf = Buffer.alloc(lines.length * maxLen * 3);

    for (let row = 0; row < lines.length; row++) {
      for (let col = 0; col < maxLen; col++) {
        const pixel = colorGrid[row]?.[col] || { r: 0, g: 0, b: 0 };
        const offset = (row * maxLen + col) * 3;
        buf[offset] = pixel.r;
        buf[offset + 1] = pixel.g;
        buf[offset + 2] = pixel.b;
      }
    }

    fs.writeFileSync(colorMapPath, buf);
    colorMapArg = colorMapPath;
  }

  await execFile(
    renderer,
    [textPath, colorMapArg, options.backgroundColor, options.textColor, outputPath, String(W), String(H)],
    { stdio: ["pipe", "pipe", "ignore"] },
  );

  try {
    fs.unlinkSync(textPath);
    if (colorMapArg !== "mono") fs.unlinkSync(colorMapArg);
  } catch {
    /* ignore */
  }

  return outputPath;
}
