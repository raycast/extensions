import { Cache } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { recognizeText } from "./recognize-text";
import { ExtensionPreferences, OCREngine } from "./types";

const execFileAsync = promisify(execFile);
const tokenCache = new Cache({ namespace: "ocr" });

interface BaiduTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface BaiduOCRResponse {
  words_result?: Array<{ words?: string }>;
  error_code?: number;
  error_msg?: string;
}

interface MinerUCreateResponse {
  code?: number;
  msg?: string;
  data?: {
    task_id?: string;
    file_url?: string;
  };
}

interface MinerUPollResponse {
  code?: number;
  msg?: string;
  data?: {
    state?: string;
    markdown_url?: string;
    err_msg?: string;
  };
}

export async function recognizeScreenshotText(preferences: ExtensionPreferences): Promise<string | undefined> {
  const imagePath = await captureScreenshotToFile();
  if (!imagePath) {
    return undefined;
  }

  try {
    try {
      const text = await recognizeImageWithEngine(imagePath, preferences.ocrEngine, preferences);
      return formatOCRText(text, preferences) || undefined;
    } catch (error) {
      if (preferences.ocrEngine !== "local" && preferences.ocrFallbackToLocal) {
        const text = await recognizeText(imagePath);
        return formatOCRText(text ?? "", preferences) || undefined;
      }
      throw error;
    }
  } finally {
    await unlink(imagePath).catch(() => undefined);
  }
}

async function captureScreenshotToFile(): Promise<string | undefined> {
  const imagePath = join(tmpdir(), `raycast-ai-translate-${Date.now()}-${Math.random().toString(16).slice(2)}.png`);

  try {
    await execFileAsync("/usr/sbin/screencapture", ["-i", imagePath], {
      timeout: 90_000,
      maxBuffer: 1024 * 1024,
    });
    return imagePath;
  } catch {
    await unlink(imagePath).catch(() => undefined);
    return undefined;
  }
}

async function recognizeImageWithEngine(
  imagePath: string,
  engine: OCREngine,
  preferences: ExtensionPreferences,
): Promise<string> {
  switch (engine) {
    case "local":
      return (await recognizeText(imagePath)) ?? "";
    case "tesseract":
      return recognizeWithTesseract(imagePath, preferences);
    case "baidu":
      return recognizeWithBaidu(imagePath, preferences);
    case "paddle":
      return recognizeWithPaddle(imagePath, preferences);
    case "mineru":
      return recognizeWithMinerU(imagePath, preferences);
  }
}

async function recognizeWithTesseract(imagePath: string, preferences: ExtensionPreferences): Promise<string> {
  const command = preferences.tesseractPath?.trim() || "tesseract";
  const languages = preferences.tesseractLanguages?.trim() || "eng";
  const { stdout } = await execFileAsync(command, [imagePath, "stdout", "-l", languages], {
    timeout: getOCRTimeoutMs(preferences),
    maxBuffer: 10 * 1024 * 1024,
  });

  const text = stdout.trim();
  if (!text) {
    throw new Error("Tesseract returned no text.");
  }

  return text;
}

async function recognizeWithBaidu(imagePath: string, preferences: ExtensionPreferences): Promise<string> {
  const apiKey = preferences.baiduOcrAPIKey?.trim();
  const secretKey = preferences.baiduOcrSecretKey?.trim();
  if (!apiKey || !secretKey) {
    throw new Error("Baidu OCR API Key or Secret Key is not configured.");
  }

  const accessToken = await getBaiduAccessToken(apiKey, secretKey, getOCRTimeoutMs(preferences));
  const endpoint = preferences.baiduOcrEndpoint === "general_basic" ? "general_basic" : "accurate_basic";
  const image = (await readFile(imagePath)).toString("base64");
  const body = new URLSearchParams({
    image,
    detect_direction: "true",
    language_type: preferences.baiduOcrLanguageType?.trim() || "CHN_ENG",
  });
  const data = await postForm<BaiduOCRResponse>(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/${endpoint}?access_token=${encodeURIComponent(accessToken)}`,
    body,
    getOCRTimeoutMs(preferences),
  );

  if (data.error_code) {
    throw new Error(data.error_msg ?? `Baidu OCR error ${data.error_code}`);
  }

  return (data.words_result ?? [])
    .map((item) => item.words?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function getBaiduAccessToken(apiKey: string, secretKey: string, timeoutMs: number): Promise<string> {
  const cacheKey = `baidu-token-${hashText(`${apiKey}:${secretKey}`)}`;
  const cached = tokenCache.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as { accessToken?: string; expiresAt?: number };
    if (parsed.accessToken && parsed.expiresAt && parsed.expiresAt > Date.now()) {
      return parsed.accessToken;
    }
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: apiKey,
    client_secret: secretKey,
  });
  const data = await postJson<BaiduTokenResponse>(
    `https://aip.baidubce.com/oauth/2.0/token?${params.toString()}`,
    {},
    timeoutMs,
  );

  if (!data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Failed to get Baidu access token.");
  }

  const expiresIn = data.expires_in ?? 2_592_000;
  tokenCache.set(
    cacheKey,
    JSON.stringify({
      accessToken: data.access_token,
      expiresAt: Date.now() + Math.max(expiresIn - 86_400, 60) * 1000,
    }),
  );

  return data.access_token;
}

async function recognizeWithPaddle(imagePath: string, preferences: ExtensionPreferences): Promise<string> {
  const endpoint = preferences.paddleOcrEndpoint?.trim();
  if (!endpoint) {
    throw new Error("PaddleOCR HTTP endpoint is not configured.");
  }

  const image = (await readFile(imagePath)).toString("base64");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = preferences.paddleOcrAPIKey?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const data = await postJson<unknown>(
    endpoint,
    {
      file: image,
      fileType: 1,
      useDocOrientationClassify: false,
      useDocUnwarping: false,
      useTextlineOrientation: true,
      visualize: false,
    },
    getOCRTimeoutMs(preferences),
    headers,
  );

  const text = extractPaddleText(data);
  if (!text) {
    throw new Error("PaddleOCR returned no text.");
  }

  return text;
}

async function recognizeWithMinerU(imagePath: string, preferences: ExtensionPreferences): Promise<string> {
  const baseURL = (preferences.mineruBaseURL?.trim() || "https://mineru.net/api/v1/agent").replace(/\/+$/, "");
  const timeoutMs = getOCRTimeoutMs(preferences);
  const fileName = `screenshot-${Date.now()}.png`;
  const createResponse = await postJson<MinerUCreateResponse>(
    `${baseURL}/parse/file`,
    {
      file_name: fileName,
      language: preferences.mineruLanguage?.trim() || "ch",
      enable_table: Boolean(preferences.mineruEnableTable),
      is_ocr: true,
      enable_formula: Boolean(preferences.mineruEnableFormula),
    },
    timeoutMs,
  );

  if (createResponse.code !== 0 || !createResponse.data?.task_id || !createResponse.data?.file_url) {
    throw new Error(createResponse.msg ?? "MinerU failed to create parse task.");
  }

  await putBinary(createResponse.data.file_url, await readFile(imagePath), timeoutMs);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await delay(1200);
    const pollResponse = await fetchJson<MinerUPollResponse>(
      `${baseURL}/parse/${encodeURIComponent(createResponse.data.task_id)}`,
      Math.max(deadline - Date.now(), 1000),
    );

    const state = pollResponse.data?.state;
    if (state === "done") {
      const markdownURL = pollResponse.data?.markdown_url;
      if (!markdownURL) {
        throw new Error("MinerU task finished without markdown_url.");
      }
      return cleanupMarkdown(await fetchText(markdownURL, Math.max(deadline - Date.now(), 1000)));
    }

    if (state === "failed" || state === "error") {
      throw new Error(pollResponse.data?.err_msg ?? pollResponse.msg ?? "MinerU OCR task failed.");
    }
  }

  throw new Error("MinerU OCR timed out.");
}

async function postJson<T>(
  url: string,
  body: unknown,
  timeoutMs: number,
  headers: Record<string, string> = { "Content-Type": "application/json" },
): Promise<T> {
  const response = await fetchWithTimeout(url, timeoutMs, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return parseJSONResponse<T>(response);
}

async function postForm<T>(url: string, body: URLSearchParams, timeoutMs: number): Promise<T> {
  const response = await fetchWithTimeout(url, timeoutMs, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return parseJSONResponse<T>(response);
}

async function putBinary(url: string, body: Buffer, timeoutMs: number): Promise<void> {
  const arrayBuffer = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  const response = await fetchWithTimeout(url, timeoutMs, {
    method: "PUT",
    body: arrayBuffer,
  });
  if (!response.ok) {
    throw new Error(`Upload failed with HTTP ${response.status}.`);
  }
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
  return parseJSONResponse<T>(await fetchWithTimeout(url, timeoutMs));
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const response = await fetchWithTimeout(url, timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.text();
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OCR request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJSONResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : {};
  if (!response.ok) {
    throw new Error(extractAPIError(data) ?? `HTTP ${response.status}: ${text.slice(0, 240)}`);
  }
  return data as T;
}

function extractPaddleText(data: unknown): string {
  const recTexts = collectValuesByKey(data, new Set(["rec_texts", "recTexts", "texts", "text"]));
  return recTexts
    .flatMap((value) => normalizeTextValue(value))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function collectValuesByKey(value: unknown, keys: Set<string>, output: unknown[] = []): unknown[] {
  if (!value || typeof value !== "object") {
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectValuesByKey(item, keys, output));
    return output;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (keys.has(key)) {
      output.push(nestedValue);
    } else {
      collectValuesByKey(nestedValue, keys, output);
    }
  }
  return output;
}

function normalizeTextValue(value: unknown): string[] {
  if (typeof value === "string") {
    return [value.trim()];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeTextValue(item));
  }

  return [];
}

function cleanupMarkdown(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatOCRText(text: string, preferences: ExtensionPreferences): string {
  const trimmed = text.trim();
  if (preferences.ocrTextLayout === "compact") {
    return trimmed.replace(/\s+/g, " ");
  }

  return trimmed;
}

function extractAPIError(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return stringOrUndefined(record.error_msg) ?? stringOrUndefined(record.errorMsg) ?? stringOrUndefined(record.msg);
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getOCRTimeoutMs(preferences: ExtensionPreferences): number {
  const seconds = Number.parseInt(preferences.ocrTimeoutSeconds ?? "20", 10);
  if (!Number.isFinite(seconds)) {
    return 20_000;
  }
  return Math.min(Math.max(seconds, 5), 180) * 1000;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}
