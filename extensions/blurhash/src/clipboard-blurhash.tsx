import {
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  List,
  Icon,
  open,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { execSync } from "child_process";
import { encode, decode } from "blurhash";
import path from "path";
import fs from "fs";
import os from "os";

const VIDEO_EXTS = new Set([
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
  ".m4v",
  ".flv",
  ".wmv",
  ".3gp",
  ".ts",
]);
const IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".tiff",
  ".tif",
  ".heic",
  ".heif",
  ".avif",
  ".ico",
]);
const SUPPORTED_EXTS = new Set([...VIDEO_EXTS, ...IMAGE_EXTS]);

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function aspectRatio(w: number, h: number): string {
  const d = gcd(w, h);
  return `${w / d}:${h / d}`;
}

function findBinary(name: string): string | null {
  for (const p of [
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`,
    `/usr/bin/${name}`,
  ]) {
    if (fs.existsSync(p)) return p;
  }
  try {
    return execSync(`which ${name}`, { encoding: "utf-8" }).trim() || null;
  } catch {
    return null;
  }
}

function getDimensions(filePath: string): { width: number; height: number } {
  const ffprobe = findBinary("ffprobe");
  if (!ffprobe)
    throw new Error("ffprobe not found — install with: brew install ffmpeg");

  const out = execSync(
    `"${ffprobe}" -v quiet -print_format json -show_streams "${filePath}"`,
    { encoding: "utf-8" },
  );
  const streams = JSON.parse(out).streams;
  const video = streams.find(
    (s: { width?: number; height?: number }) => s.width && s.height,
  );
  if (!video) throw new Error("Could not read dimensions");
  return { width: video.width, height: video.height };
}

function getPixelData(
  filePath: string,
  w: number,
  h: number,
): Uint8ClampedArray {
  const ffmpeg = findBinary("ffmpeg");
  if (!ffmpeg)
    throw new Error("ffmpeg not found — install with: brew install ffmpeg");

  const buf = execSync(
    `"${ffmpeg}" -y -i "${filePath}" -vframes 1 -s ${w}x${h} -f rawvideo -pix_fmt rgba pipe:1`,
    { maxBuffer: 50 * 1024 * 1024 },
  );
  return new Uint8ClampedArray(buf);
}

interface BlurHashResult {
  hash: string;
  width: number;
  height: number;
  ratio: string;
  fileName: string;
  copyText: string;
  previewDataUri: string;
}

function generatePreview(hash: string, width: number, height: number): string {
  const ffmpeg = findBinary("ffmpeg");
  if (!ffmpeg)
    throw new Error("ffmpeg not found — install with: brew install ffmpeg");

  const pw = 400;
  const ph = Math.round((height / width) * pw);
  const pixels = decode(hash, pw, ph);

  // Convert raw RGBA to PNG via ffmpeg, return as base64 data URI
  const rawPath = path.join(os.tmpdir(), `blurhash-raw-${Date.now()}.rgba`);
  const pngPath = path.join(os.tmpdir(), `blurhash-png-${Date.now()}.png`);

  fs.writeFileSync(rawPath, Buffer.from(pixels.buffer));
  execSync(
    `"${ffmpeg}" -y -f rawvideo -pix_fmt rgba -s ${pw}x${ph} -i "${rawPath}" "${pngPath}"`,
    { stdio: "pipe" },
  );

  const pngBuffer = fs.readFileSync(pngPath);
  fs.unlinkSync(rawPath);
  fs.unlinkSync(pngPath);

  return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}

function generateBlurHash(filePath: string): BlurHashResult {
  const { width, height } = getDimensions(filePath);

  // Resize for hash computation — keep aspect ratio, max 100px
  const scale = Math.min(100 / width, 100 / height, 1);
  const sw = Math.round(width * scale);
  const sh = Math.round(height * scale);

  const pixels = getPixelData(filePath, sw, sh);
  const hash = encode(pixels, sw, sh, 4, 3);

  const previewDataUri = generatePreview(hash, width, height);

  const fileName = path.basename(filePath);
  const ratio = aspectRatio(width, height);
  const copyText = `${fileName} ${width}x${height} ${ratio} ${hash}`;

  return { hash, width, height, ratio, fileName, copyText, previewDataUri };
}

function isFile(p: string): boolean {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function hasSupportedExt(p: string): boolean {
  return SUPPORTED_EXTS.has(path.extname(p).toLowerCase());
}

function resolveClipboardFile(clip: {
  file?: string;
  text?: string;
}): string | null {
  // Method 1: Raycast clipboard file property (trust it — can be extensionless temp files)
  if (clip.file) {
    const f = decodeURIComponent(clip.file.replace(/^file:\/\//, ""));
    if (isFile(f)) return f;
  }

  // Method 2: Clipboard text is a file path
  if (clip.text) {
    const text = clip.text.trim().replace(/^file:\/\//, "");
    const decoded = decodeURIComponent(text);
    if (isFile(decoded) && hasSupportedExt(decoded)) return decoded;
    if (isFile(text) && hasSupportedExt(text)) return text;
  }

  // Method 3: AppleScript to get Finder copied file
  try {
    const result = execSync(
      `osascript -e 'try' -e 'set f to the clipboard as «class furl»' -e 'return POSIX path of f' -e 'end try'`,
      { encoding: "utf-8", timeout: 3000 },
    ).trim();
    if (isFile(result) && hasSupportedExt(result)) return result;
  } catch {
    // ignore
  }

  // Method 4: Get current Finder selection
  try {
    const result = execSync(
      `osascript -e 'tell application "Finder"' -e 'if (count of (selection as list)) > 0 then' -e 'return POSIX path of (first item of (selection as alias list) as alias)' -e 'end if' -e 'end tell'`,
      { encoding: "utf-8", timeout: 3000 },
    ).trim();
    if (isFile(result) && hasSupportedExt(result)) return result;
  } catch {
    // ignore
  }

  return null;
}

function ResultView({ result }: { result: BlurHashResult }) {
  const markdown = `\n\n\n\n![preview](${result.previewDataUri})`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="File" text={result.fileName} />
          <Detail.Metadata.Label
            title="Dimensions"
            text={`${result.width} × ${result.height}`}
          />
          <Detail.Metadata.Label title="Ratio" text={result.ratio} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="BlurHash" text={result.hash} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy BlurHash" content={result.hash} />
          <Action.CopyToClipboard title="Copy All" content={result.copyText} />
        </ActionPanel>
      }
    />
  );
}

function FallbackMenu({
  onResult,
}: {
  onResult: (result: BlurHashResult) => void;
}) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Image}
        title="No image found in clipboard"
        description="Select a file from Finder or pick from Clipboard History"
      />
      <List.Item
        icon={Icon.Clipboard}
        title="Open Clipboard History"
        subtitle="Re-copy a file, then try again"
        actions={
          <ActionPanel>
            <Action
              title="Open Clipboard History"
              onAction={() =>
                open(
                  "raycast://extensions/raycast/clipboard-history/clipboard-history",
                )
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Finder}
        title="Select from Finder"
        subtitle="Pick an image or video file"
        actions={
          <ActionPanel>
            <Action
              title="Open File Picker"
              onAction={async () => {
                try {
                  const filePath = execSync(
                    `osascript -e 'POSIX path of (choose file of type {"public.jpeg", "public.png", "com.compuserve.gif", "com.microsoft.bmp", "org.webmproject.webp", "public.tiff", "public.heic", "public.heif", "public.avif", "com.microsoft.ico", "public.movie"} with prompt "Select an image or video")'`,
                    { encoding: "utf-8", timeout: 120000 },
                  ).trim();
                  if (!filePath || !isFile(filePath)) return;
                  await showToast({
                    style: Toast.Style.Animated,
                    title: "Generating BlurHash...",
                  });
                  const res = generateBlurHash(filePath);
                  onResult(res);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Done!",
                  });
                  // Bring Raycast back to focus after native file dialog
                  setTimeout(() => {
                    try {
                      execSync(
                        `osascript -e 'tell application "System Events" to tell process "Raycast" to set frontmost to true'`,
                        { stdio: "pipe", timeout: 3000 },
                      );
                    } catch {
                      /* ignore */
                    }
                  }, 100);
                } catch {
                  // User cancelled the dialog
                }
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function cleanupStaleTempFiles() {
  try {
    const tmpDir = os.tmpdir();
    for (const f of fs.readdirSync(tmpDir)) {
      if (f.startsWith("blurhash-raw-") || f.startsWith("blurhash-png-")) {
        try {
          fs.unlinkSync(path.join(tmpDir, f));
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

export default function Command() {
  const [showPicker, setShowPicker] = useState(false);
  const [missingFfmpeg, setMissingFfmpeg] = useState(false);
  const [result, setResult] = useState<BlurHashResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    cleanupStaleTempFiles();

    if (!findBinary("ffmpeg") || !findBinary("ffprobe")) {
      setMissingFfmpeg(true);
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Reading clipboard...",
        });
        const clip = await Clipboard.read();
        const filePath = resolveClipboardFile(clip);

        if (!filePath) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No image in clipboard",
          });
          setShowPicker(true);
          setIsLoading(false);
          return;
        }

        await showToast({
          style: Toast.Style.Animated,
          title: "Generating BlurHash...",
        });
        const res = generateBlurHash(filePath);
        setResult(res);
        await showToast({ style: Toast.Style.Success, title: "Done!" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: msg,
        });
        setShowPicker(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (missingFfmpeg) {
    return (
      <Detail
        markdown={`# ffmpeg not found\n\nThis extension requires ffmpeg to process images and videos.\n\nInstall it with Homebrew:\n\n\`\`\`\nbrew install ffmpeg\n\`\`\``}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Install Command"
              content="brew install ffmpeg"
            />
            <Action.OpenInBrowser
              title="Open Homebrew Formula"
              url="https://formulae.brew.sh/formula/ffmpeg"
            />
          </ActionPanel>
        }
      />
    );
  }

  if (result) {
    return <ResultView result={result} />;
  }

  if (showPicker) {
    return (
      <FallbackMenu
        onResult={(res) => {
          setShowPicker(false);
          setResult(res);
        }}
      />
    );
  }

  return <Detail isLoading={isLoading} markdown="" />;
}
