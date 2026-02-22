import { readFile } from "node:fs/promises";
import { getPreferences } from "./types";
import type { OCRResult, PaddleOCRRequest, PaddleOCRResponse } from "./types";

const REQUEST_TIMEOUT_MS = 30_000;
const API_PATH = "/layout-parsing";

async function encodeImageToBase64(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return buffer.toString("base64");
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

export async function recognizeText(imagePath: string): Promise<OCRResult> {
  const prefs = getPreferences();
  const endpoint = buildEndpoint(prefs.apiUrl);

  const base64Image = await encodeImageToBase64(imagePath);

  /** fileType 1 = base64 encoded image */
  const body: PaddleOCRRequest = {
    file: base64Image,
    fileType: 1,
  };

  if (prefs.useDocOrientationClassify) {
    body.useDocOrientationClassify = true;
  }
  if (prefs.useDocUnwarping) {
    body.useDocUnwarping = true;
  }
  if (prefs.useChartRecognition) {
    body.useChartRecognition = true;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${prefs.accessToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("API request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

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

  const data = (await response.json()) as PaddleOCRResponse;

  if (data.errorCode !== 0) {
    throw new Error(`PaddleOCR error: ${data.errorMsg} (code: ${data.errorCode})`);
  }

  const results = data.result?.layoutParsingResults ?? [];
  const text = results
    .map((r) => r.markdown?.text ?? "")
    .filter(Boolean)
    .join("\n");

  return { text, raw: data };
}
