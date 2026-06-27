import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const execFileAsync = promisify(execFile);
const SCREENSHOT_DELAY_MS = 250;

type ScanState =
  | { status: "scanning" }
  | { status: "success"; contents: string[] }
  | { status: "failure"; message: string };

export default function Command() {
  const [state, setState] = useState<ScanState>({ status: "scanning" });

  useEffect(() => {
    let isMounted = true;

    scanDisplay()
      .then((contents) => {
        if (!isMounted) {
          return;
        }

        setState({ status: "success", contents });
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setState({
          status: "failure",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.status === "failure") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Could not scan display"
          description={state.message}
        />
      </List>
    );
  }

  if (state.status === "success" && state.contents.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No QR code found"
          description="Make sure QR codes are visible and unobstructed."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={state.status === "scanning"}
      searchBarPlaceholder="Search decoded QR contents"
    >
      {state.status === "success" && state.contents.length > 1 ? (
        <List.Item
          icon={Icon.Clipboard}
          title="Copy All QR Contents"
          subtitle={`${state.contents.length} QR codes found`}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Clipboard}
                title="Copy All"
                onAction={() => copyAllQrContents(state.contents)}
              />
            </ActionPanel>
          }
        />
      ) : null}

      {state.status === "success"
        ? state.contents.map((content, index) => (
            <List.Item
              key={content}
              icon={Icon.Code}
              title={content}
              subtitle={`QR Code ${index + 1}`}
              accessories={[{ text: `${content.length} chars` }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy QR Content"
                    content={content}
                  />
                  <Action
                    icon={Icon.Clipboard}
                    title="Copy All QR Contents"
                    onAction={() => copyAllQrContents(state.contents)}
                  />
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}

async function scanDisplay() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Scanning display deeply...",
  });

  const tempDirectory = await mkdtemp(join(tmpdir(), "raycast-qr-"));
  const screenshotPath = join(tempDirectory, "display.png");

  try {
    await closeMainWindow({ clearRootSearch: true });
    await wait(SCREENSHOT_DELAY_MS);
    await captureDisplay(screenshotPath);

    const contents = await decodeQrsFromPng(screenshotPath);
    toast.style =
      contents.length > 0 ? Toast.Style.Success : Toast.Style.Failure;
    toast.title =
      contents.length > 0
        ? `Found ${contents.length} QR code${contents.length === 1 ? "" : "s"}`
        : "No QR code found";
    toast.message =
      contents.length > 0
        ? "Choose a result or copy all contents."
        : "Make sure QR codes are visible and unobstructed.";

    return contents;
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}

async function copyAllQrContents(contents: string[]) {
  await Clipboard.copy(contents.join("\n"));
  await showHUD(`Copied ${contents.length} QR code contents to clipboard`);
}

async function captureDisplay(outputPath: string) {
  switch (process.platform) {
    case "darwin":
      await captureMacDisplay(outputPath);
      return;
    case "win32":
      await captureWindowsDisplay(outputPath);
      return;
    default:
      throw new Error("This command currently supports macOS and Windows.");
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function captureMacDisplay(outputPath: string) {
  await execFileAsync("screencapture", ["-x", outputPath]);
}

async function captureWindowsDisplay(outputPath: string) {
  const escapedOutputPath = outputPath.replaceAll("'", "''");
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screens = [System.Windows.Forms.Screen]::AllScreens
$left = ($screens | ForEach-Object { $_.Bounds.Left } | Measure-Object -Minimum).Minimum
$top = ($screens | ForEach-Object { $_.Bounds.Top } | Measure-Object -Minimum).Minimum
$right = ($screens | ForEach-Object { $_.Bounds.Right } | Measure-Object -Maximum).Maximum
$bottom = ($screens | ForEach-Object { $_.Bounds.Bottom } | Measure-Object -Maximum).Maximum
$width = $right - $left
$height = $bottom - $top

$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($left, $top, 0, 0, $bitmap.Size)
$bitmap.Save('${escapedOutputPath}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`;

  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ]);
}

async function decodeQrsFromPng(path: string) {
  const pngBuffer = await readFile(path);
  const image = PNG.sync.read(pngBuffer);
  const contents = new Set<string>();
  const fullImageContent = decodeImage(image.data, image.width, image.height);

  if (fullImageContent) {
    contents.add(fullImageContent);
  }

  for (const content of decodeImageRegions(image)) {
    contents.add(content);
  }

  return [...contents];
}

function decodeImage(data: Uint8Array, width: number, height: number) {
  const clampedData = new Uint8ClampedArray(
    data.buffer,
    data.byteOffset,
    data.byteLength,
  );
  const result = jsQR(clampedData, width, height, {
    inversionAttempts: "attemptBoth",
  });

  return result?.data;
}

function decodeImageRegions(image: PNG) {
  const contents = new Set<string>();

  for (const region of getScanRegions(image.width, image.height)) {
    const cropped = cropImage(image.data, image.width, region);
    const decoded = decodeImage(cropped.data, cropped.width, cropped.height);

    if (decoded) {
      contents.add(decoded);
    }

    if (cropped.width <= 900 && cropped.height <= 900) {
      const scaled = scaleImage(cropped.data, cropped.width, cropped.height, 2);
      const decodedScaled = decodeImage(
        scaled.data,
        scaled.width,
        scaled.height,
      );

      if (decodedScaled) {
        contents.add(decodedScaled);
      }
    }
  }

  return contents;
}

function getScanRegions(width: number, height: number) {
  const regions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  const tileSizes = [1200, 800, 500];

  for (const tileSize of tileSizes) {
    const regionWidth = Math.min(tileSize, width);
    const regionHeight = Math.min(tileSize, height);
    const stepX = Math.max(1, Math.floor(regionWidth * 0.55));
    const stepY = Math.max(1, Math.floor(regionHeight * 0.55));
    const xs = getScanOffsets(width, regionWidth, stepX);
    const ys = getScanOffsets(height, regionHeight, stepY);

    for (const y of ys) {
      for (const x of xs) {
        regions.push({ x, y, width: regionWidth, height: regionHeight });
      }
    }
  }

  return regions;
}

function getScanOffsets(totalSize: number, regionSize: number, step: number) {
  const offsets = new Set<number>([0, Math.max(0, totalSize - regionSize)]);

  for (let offset = 0; offset + regionSize < totalSize; offset += step) {
    offsets.add(offset);
  }

  return [...offsets].sort((a, b) => a - b);
}

function cropImage(
  source: Uint8Array,
  sourceWidth: number,
  region: { x: number; y: number; width: number; height: number },
) {
  const cropped = new Uint8Array(region.width * region.height * 4);

  for (let y = 0; y < region.height; y += 1) {
    const sourceStart = ((region.y + y) * sourceWidth + region.x) * 4;
    const sourceEnd = sourceStart + region.width * 4;
    const targetStart = y * region.width * 4;

    cropped.set(source.subarray(sourceStart, sourceEnd), targetStart);
  }

  return { data: cropped, width: region.width, height: region.height };
}

function scaleImage(
  source: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
) {
  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;
  const scaled = new Uint8Array(scaledWidth * scaledHeight * 4);

  for (let y = 0; y < scaledHeight; y += 1) {
    for (let x = 0; x < scaledWidth; x += 1) {
      const sourceX = Math.floor(x / scale);
      const sourceY = Math.floor(y / scale);
      const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
      const targetIndex = (y * scaledWidth + x) * 4;

      scaled[targetIndex] = source[sourceIndex];
      scaled[targetIndex + 1] = source[sourceIndex + 1];
      scaled[targetIndex + 2] = source[sourceIndex + 2];
      scaled[targetIndex + 3] = source[sourceIndex + 3];
    }
  }

  return { data: scaled, width: scaledWidth, height: scaledHeight };
}
