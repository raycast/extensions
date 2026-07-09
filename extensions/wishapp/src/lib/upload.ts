import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { runPowerShellScript } from "@raycast/utils";
import { apiFetch } from "./api";

const execFileAsync = promisify(execFile);

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_EXTS = new Set(ALLOWED_IMAGE_EXTENSIONS);
const MAX_BYTES = 5 * 1024 * 1024;

// Matches the stored full size (lib/server/image-storage.ts resizes to height
// 900), so the server's own resize of our pre-shrunk upload is a no-op and
// never upscales.
const MAX_HEIGHT = 900;
// Near-lossless: this JPEG is only a transport format — the server re-encodes
// to the stored webp (q85/80), so the intermediate must not add its own
// compression loss on top.
const JPEG_QUALITY = 100;

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function isAllowedImagePath(filePath: string): boolean {
  return ALLOWED_EXTS.has(path.extname(filePath).toLowerCase());
}

type UploadResponse = {
  success: true;
  key: string;
};

type OptimizedImage = {
  body: Buffer;
  contentType: string;
};

/**
 * Pick a local image, shrink it with OS-native tools (macOS `sips`, Windows
 * PowerShell + System.Drawing — no npm image dependencies), and POST the bytes
 * to /api/v1/upload/items, which encodes the stored webp full + thumbnail with
 * the same sharp pipeline the web app uses. Optimization is best-effort: on
 * any failure the original file is uploaded and the server resizes it anyway.
 * Returns the storage filename to pass as `imageKey` on item create.
 */
export async function uploadItemImage(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    throw new Error(`Unsupported file type "${ext}". Use JPG, PNG, WebP, or GIF.`);
  }

  const original = await readFile(filePath);
  const optimized = await optimizeImage(filePath, ext);
  const upload =
    optimized && optimized.body.length < original.length ? optimized : { body: original, contentType: MIME_TYPES[ext] };

  if (upload.body.length > MAX_BYTES) {
    const mb = (upload.body.length / 1024 / 1024).toFixed(1);
    throw new Error(`Image is too large (${mb} MB). Max is 5 MB.`);
  }

  const { key } = await apiFetch<UploadResponse>("/api/v1/upload/items", {
    method: "POST",
    headers: { "Content-Type": upload.contentType },
    body: upload.body,
  });
  return key;
}

/**
 * Resize to height ≤900 before upload, per platform. Returns undefined when
 * there is nothing to gain (already ≤900 tall) or when the platform tool
 * can't handle the file — the caller then uploads the original bytes.
 * PNG stays PNG to preserve transparency; everything else becomes JPEG.
 */
async function optimizeImage(filePath: string, ext: string): Promise<OptimizedImage | undefined> {
  try {
    if (process.platform === "darwin") return await optimizeWithSips(filePath, ext);
    if (process.platform === "win32") return await optimizeWithPowerShell(filePath, ext);
  } catch {
    // Best-effort only — fall through to uploading the original.
  }
  return undefined;
}

/**
 * macOS: one `sips` call decodes JPG/PNG/WebP/GIF (first frame), resizes by
 * height, and encodes the output. sips has no upscale guard, so the height is
 * checked first (`-g pixelHeight` prints `<nil>` for unreadable files, which
 * fails the regex). sips can exit 0 without writing output; readFile throwing
 * on the missing temp file surfaces that as a failure. EXIF orientation is
 * kept as a tag (sips never rotates pixels); the server's sharp `.rotate()`
 * bakes it in.
 */
async function optimizeWithSips(filePath: string, ext: string): Promise<OptimizedImage | undefined> {
  const { stdout } = await execFileAsync("sips", ["-g", "pixelHeight", filePath]);
  const match = /pixelHeight: (\d+)/.exec(stdout);
  if (!match || Number(match[1]) <= MAX_HEIGHT) return undefined;

  const format = ext === ".png" ? "png" : "jpeg";
  const outPath = tempOutputPath(format);
  const args = ["--resampleHeight", String(MAX_HEIGHT), "-s", "format", format];
  if (format === "jpeg") args.push("-s", "formatOptions", String(JPEG_QUALITY));
  args.push(filePath, "--out", outPath);

  try {
    await execFileAsync("sips", args);
    return await readOptimized(outPath, format);
  } finally {
    await rm(outPath, { force: true });
  }
}

/**
 * Windows: PowerShell + System.Drawing (GDI+), which ships with every
 * Windows 10/11 install. GDI+ cannot decode WebP, so those upload as-is.
 * GDI+ does not auto-rotate, so EXIF orientation is baked in before resizing.
 * The script prints SKIP instead of writing output when the image is already
 * small enough.
 */
async function optimizeWithPowerShell(filePath: string, ext: string): Promise<OptimizedImage | undefined> {
  if (ext === ".webp") return undefined;

  const format = ext === ".png" ? "png" : "jpeg";
  const outPath = tempOutputPath(format);

  try {
    const result = await runPowerShellScript(buildResizeScript(filePath, outPath, format), {
      timeout: 20000,
    });
    if (result.trim() === "SKIP") return undefined;
    return await readOptimized(outPath, format);
  } finally {
    await rm(outPath, { force: true });
  }
}

function buildResizeScript(inputPath: string, outputPath: string, format: "png" | "jpeg"): string {
  // Single-quoted PowerShell literals: backslashes and unicode pass through;
  // only embedded quotes need doubling.
  const escape = (p: string) => p.replace(/'/g, "''");
  const save =
    format === "jpeg"
      ? `$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]${JPEG_QUALITY})
    $bmp.Save('${escape(outputPath)}', $codec, $params)`
      : `$bmp.Save('${escape(outputPath)}', [System.Drawing.Imaging.ImageFormat]::Png)`;

  return `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${escape(inputPath)}')
try {
  if ($src.PropertyIdList -contains 0x0112) {
    switch ([int]$src.GetPropertyItem(0x0112).Value[0]) {
      2 { $src.RotateFlip('RotateNoneFlipX') }
      3 { $src.RotateFlip('Rotate180FlipNone') }
      4 { $src.RotateFlip('Rotate180FlipX') }
      5 { $src.RotateFlip('Rotate90FlipX') }
      6 { $src.RotateFlip('Rotate90FlipNone') }
      7 { $src.RotateFlip('Rotate270FlipX') }
      8 { $src.RotateFlip('Rotate270FlipNone') }
    }
  }
  if ($src.Height -le ${MAX_HEIGHT}) {
    Write-Output 'SKIP'
  } else {
    $w = [int][Math]::Round($src.Width * ${MAX_HEIGHT} / $src.Height)
    $bmp = New-Object System.Drawing.Bitmap($w, ${MAX_HEIGHT})
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.DrawImage($src, 0, 0, $w, ${MAX_HEIGHT})
    } finally { $g.Dispose() }
    ${save}
    $bmp.Dispose()
  }
} finally {
  $src.Dispose()
}
`;
}

function tempOutputPath(format: "png" | "jpeg"): string {
  return path.join(os.tmpdir(), `wishapp-${randomUUID()}.${format === "png" ? "png" : "jpg"}`);
}

async function readOptimized(outPath: string, format: "png" | "jpeg"): Promise<OptimizedImage | undefined> {
  const body = await readFile(outPath);
  if (body.length === 0) return undefined;
  return { body, contentType: format === "png" ? "image/png" : "image/jpeg" };
}
