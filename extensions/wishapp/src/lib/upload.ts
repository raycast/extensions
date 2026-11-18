import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { runPowerShellScript } from "@raycast/utils";
import { apiFetch } from "./api";

const execFileAsync = promisify(execFile);

const MAX_UPLOAD_MB = 5;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const POWERSHELL_TIMEOUT_MS = 20_000;

// Matches the stored full size (lib/server/image-storage.ts resizes to height
// 900), so the server's own resize of our pre-shrunk upload is a no-op and
// never upscales.
const MAX_HEIGHT = 900;
// Near-lossless. This JPEG is only a transport format: the server re-encodes to
// the stored webp (q85/80), so the intermediate must not add compression loss
// of its own on top.
const JPEG_QUALITY = 100;

const MIME_TYPES: Record<string, string | undefined> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const ALLOWED_IMAGE_EXTENSIONS = Object.keys(MIME_TYPES);

/** `format` doubles as the value `sips -s format` expects. */
type OutputFormat = "png" | "jpeg";

const OUTPUT_FORMATS: Record<OutputFormat, { fileExtension: string; mimeType: string }> = {
  png: { fileExtension: "png", mimeType: "image/png" },
  jpeg: { fileExtension: "jpg", mimeType: "image/jpeg" },
};

type OptimizedImage = {
  body: Buffer;
  contentType: string;
};

type UploadResponse = {
  success: true;
  key: string;
};

/** Resizes `filePath` into `outPath`. Resolves false when there was nothing to do. */
type Resize = (filePath: string, format: OutputFormat, outPath: string) => Promise<boolean>;

export function isAllowedImagePath(filePath: string): boolean {
  return ALLOWED_IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

/**
 * Pick a local image, shrink it with OS-native tools (macOS `sips`, Windows
 * PowerShell + System.Drawing, so no npm image dependencies), and POST the
 * bytes to /api/v1/upload/items, which encodes the stored webp full size and
 * thumbnail with the same sharp pipeline the web app uses. Optimization is
 * best-effort: on any failure the original file is uploaded and the server
 * resizes it anyway. Returns the storage filename to pass as `imageKey` on
 * item create.
 */
export async function uploadItemImage(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const originalType = MIME_TYPES[ext];
  if (!originalType) {
    throw new Error(`Unsupported file type "${ext}". Use JPG, PNG, WebP, or GIF.`);
  }

  const original = await readFile(filePath);
  const optimized = await optimizeImage(filePath, ext);
  const upload =
    optimized && optimized.body.length < original.length ? optimized : { body: original, contentType: originalType };

  if (upload.body.length > MAX_UPLOAD_BYTES) {
    const mb = (upload.body.length / 1024 / 1024).toFixed(1);
    throw new Error(`Image is too large (${mb} MB). Max is ${MAX_UPLOAD_MB} MB.`);
  }

  const { key } = await apiFetch<UploadResponse>("/api/v1/upload/items", {
    method: "POST",
    headers: { "Content-Type": upload.contentType },
    body: upload.body,
  });
  return key;
}

function resizerFor(ext: string): Resize | undefined {
  if (process.platform === "darwin") return resizeWithSips;
  // GDI+ ships with every Windows 10/11 install but cannot decode WebP, so
  // those upload as-is and the server shrinks them.
  if (process.platform === "win32") return ext === ".webp" ? undefined : resizeWithPowerShell;
  return undefined;
}

/**
 * Resize to a height of at most 900 before upload. Returns undefined whenever
 * there is nothing to gain (already short enough) or the platform tool can't
 * handle the file, and the caller then uploads the original bytes. PNG stays
 * PNG to preserve transparency; everything else becomes JPEG.
 */
async function optimizeImage(filePath: string, ext: string): Promise<OptimizedImage | undefined> {
  const resize = resizerFor(ext);
  if (!resize) return undefined;

  const format: OutputFormat = ext === ".png" ? "png" : "jpeg";
  const outPath = tempOutputPath(format);

  try {
    if (!(await resize(filePath, format, outPath))) return undefined;
    const body = await readFile(outPath);
    // sips can exit 0 without writing anything, leaving an absent or empty file.
    return body.length > 0 ? { body, contentType: OUTPUT_FORMATS[format].mimeType } : undefined;
  } catch {
    return undefined; // Best-effort only: fall back to uploading the original.
  } finally {
    // Windows can still hold a lock on the file, and `force` only swallows ENOENT.
    await rm(outPath, { force: true }).catch(() => undefined);
  }
}

/**
 * macOS: one `sips` call decodes JPG/PNG/WebP/GIF (first frame), resizes by
 * height, and encodes the output. sips has no upscale guard, so the height is
 * checked first (`-g pixelHeight` prints `<nil>` for unreadable files, which
 * fails the regex). EXIF orientation is kept as a tag, since sips never rotates
 * pixels; the server's sharp `.rotate()` bakes it in.
 */
const resizeWithSips: Resize = async (filePath, format, outPath) => {
  const { stdout } = await execFileAsync("sips", ["-g", "pixelHeight", filePath]);
  const match = /pixelHeight: (\d+)/.exec(stdout);
  if (!match || Number(match[1]) <= MAX_HEIGHT) return false;

  const args = ["--resampleHeight", String(MAX_HEIGHT), "-s", "format", format];
  if (format === "jpeg") args.push("-s", "formatOptions", String(JPEG_QUALITY));
  await execFileAsync("sips", [...args, filePath, "--out", outPath]);
  return true;
};

/**
 * Windows: PowerShell + System.Drawing (GDI+). GDI+ does not auto-rotate, so
 * EXIF orientation is baked into the pixels before resizing. The script prints
 * SKIP instead of writing output when the image is already small enough.
 */
const resizeWithPowerShell: Resize = async (filePath, format, outPath) => {
  const result = await runPowerShellScript(buildResizeScript(filePath, outPath, format), {
    timeout: POWERSHELL_TIMEOUT_MS,
  });
  return result.trim() !== "SKIP";
};

/**
 * `runPowerShellScript` pipes the script into `powershell.exe -Command -`, and
 * Windows PowerShell decodes stdin with the console's OEM code page rather than
 * UTF-8. A path holding any non-ASCII byte (a temp dir under `C:\Users\Søren`,
 * say) would arrive mangled, so paths travel as base64 and PowerShell rebuilds
 * the exact string. This keeps the whole script pure ASCII, quotes included.
 */
function psPath(value: string): string {
  return `[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(value, "utf8").toString("base64")}'))`;
}

function buildResizeScript(inputPath: string, outputPath: string, format: OutputFormat): string {
  const save =
    format === "jpeg"
      ? `$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]${JPEG_QUALITY})
    $bmp.Save($outPath, $codec, $params)`
      : `$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)`;

  return `
Add-Type -AssemblyName System.Drawing
$outPath = ${psPath(outputPath)}
$src = [System.Drawing.Image]::FromFile(${psPath(inputPath)})
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

function tempOutputPath(format: OutputFormat): string {
  return path.join(os.tmpdir(), `wishapp-${randomUUID()}.${OUTPUT_FORMATS[format].fileExtension}`);
}
