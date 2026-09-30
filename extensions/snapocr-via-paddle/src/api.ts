import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { extname } from "node:path";
import { getPreferences } from "./types";
import type { OCRFileType, OCRResult, PaddleOCRRequest, PaddleOCRResponse } from "./types";

const REQUEST_TIMEOUT_MS = 60_000;
const API_PATH = "/layout-parsing";
const IMAGE_EXTENSIONS = new Set([".bmp", ".gif", ".heic", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"]);
const DEFAULT_MAX_IMAGE_DIMENSION = 2400;
const FAST_MODE_MAX_IMAGE_DIMENSION = 1800;

interface PreparedUpload {
  filePath: string;
  cleanup?: () => Promise<void>;
}

async function encodeFileToBase64(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return buffer.toString("base64");
}

function execFileAsync(file: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath]);
    const width = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] ?? 0);
    const height = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0);

    if (!width || !height) {
      return null;
    }

    return { width, height };
  } catch {
    return null;
  }
}

async function prepareImageForUpload(filePath: string, maxDimension: number): Promise<PreparedUpload> {
  const dimensions = await getImageDimensions(filePath);
  if (!dimensions || Math.max(dimensions.width, dimensions.height) <= maxDimension) {
    return { filePath };
  }

  const outputPath = `${environment.supportPath}/ocr-upload-${Date.now()}${extname(filePath) || ".png"}`;

  try {
    await execFileAsync("/usr/bin/sips", ["-Z", String(maxDimension), filePath, "--out", outputPath]);
    return {
      filePath: outputPath,
      cleanup: async () => {
        try {
          await unlink(outputPath);
        } catch {
          // Ignore temporary file cleanup failures.
        }
      },
    };
  } catch {
    return { filePath };
  }
}

async function prepareFileForUpload(
  filePath: string,
  fileType: OCRFileType,
  fastMode: boolean,
): Promise<PreparedUpload> {
  if (fileType !== 1) {
    return { filePath };
  }

  const maxDimension = fastMode ? FAST_MODE_MAX_IMAGE_DIMENSION : DEFAULT_MAX_IMAGE_DIMENSION;
  return prepareImageForUpload(filePath, maxDimension);
}

export function getOCRFileType(filePath: string): OCRFileType {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".pdf") {
    return 0;
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return 1;
  }

  throw new Error("Unsupported file type. Choose a PDF or a common image format.");
}

function buildEndpoint(apiUrl: string): string {
  const trimmed = apiUrl.replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid API URL. Please check extension preferences.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("API URL must use HTTPS.");
  }
  return `${trimmed}${API_PATH}`;
}

async function fetchWithTimeout(endpoint: string, init: RequestInit, timeoutMs: number): Promise<PaddleOCRResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, { ...init, signal: controller.signal });

    if (!response.ok) {
      let errorDetail = "";
      try {
        const errorBody = await response.text();
        errorDetail = errorBody.substring(0, 200);
      } catch {
        // ignore
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error("Authentication failed. Please check your Access Token in extension preferences.");
      }
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}${errorDetail ? ` - ${errorDetail}` : ""}`,
      );
    }

    return (await response.json()) as PaddleOCRResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("API request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function recognizeFile(filePath: string): Promise<OCRResult> {
  const prefs = getPreferences();
  const endpoint = buildEndpoint(prefs.apiUrl);
  const fileType = getOCRFileType(filePath);
  const fastMode = prefs.fastMode ?? false;
  const preparedUpload = await prepareFileForUpload(filePath, fileType, fastMode);

  try {
    const base64File = await encodeFileToBase64(preparedUpload.filePath);

    const body: PaddleOCRRequest = {
      file: base64File,
      fileType,
    };

    if (!fastMode && prefs.useDocOrientationClassify) {
      body.useDocOrientationClassify = true;
    }
    if (!fastMode && prefs.useDocUnwarping) {
      body.useDocUnwarping = true;
    }
    if (!fastMode && prefs.useChartRecognition) {
      body.useChartRecognition = true;
    }

    const data = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${prefs.accessToken}`,
        },
        body: JSON.stringify(body),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (data.errorCode !== 0) {
      throw new Error(`PaddleOCR error: ${data.errorMsg} (code: ${data.errorCode})`);
    }

    const results = data.result?.layoutParsingResults ?? [];
    const pages = results.map((result, index) => ({
      index,
      text: result.markdown?.text ?? "",
      images: result.markdown?.images ?? {},
      raw: result,
    }));
    const text = pages
      .map((page) => page.text)
      .filter(Boolean)
      .join("\n\n");

    return { text, pages, raw: data };
  } finally {
    await preparedUpload.cleanup?.();
  }
}

export async function recognizeText(imagePath: string): Promise<OCRResult> {
  return recognizeFile(imagePath);
}
