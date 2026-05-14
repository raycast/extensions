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
  paragraphs_result?: Array<{ words_result_idx?: number[] }>;
  error_code?: number;
  error_msg?: string;
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
        const formatted = formatOCRText(text ?? "", preferences);
        if (formatted) {
          return formatted;
        }
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
  const useParagraph = Boolean(preferences.baiduOcrParagraph);
  const langType = preferences.baiduOcrLanguageType?.trim() || "CHN_ENG";
  const image = (await readFile(imagePath)).toString("base64");

  const params: Record<string, string> = {
    image,
    detect_direction: "true",
    language_type: langType === "auto_detect" && endpoint === "general_basic" ? "CHN_ENG" : langType,
  };
  if (useParagraph) params.paragraph = "true";

  const data = await postForm<BaiduOCRResponse>(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/${endpoint}?access_token=${encodeURIComponent(accessToken)}`,
    new URLSearchParams(params),
    getOCRTimeoutMs(preferences),
  );

  if (data.error_code) {
    throw new Error(data.error_msg ?? `Baidu OCR error ${data.error_code}`);
  }

  const words = (data.words_result ?? []).map((item) => item.words?.trim() ?? "");

  if (useParagraph && data.paragraphs_result?.length) {
    return data.paragraphs_result
      .map((para) => (para.words_result_idx ?? []).map((idx) => words[idx] ?? "").join(" "))
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  return words.filter(Boolean).join("\n").trim();
}

async function getBaiduAccessToken(apiKey: string, secretKey: string, timeoutMs: number): Promise<string> {
  const cacheKey = `baidu-token-${hashText(`${apiKey}:${secretKey}`)}`;
  const cached = tokenCache.get(cacheKey);
  if (cached) {
    const parsed = safeParseCachedToken(cached);
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
  const data = safeParseJson(text);
  if (!response.ok) {
    throw new Error(extractAPIError(data) ?? `HTTP ${response.status}: ${text.slice(0, 240)}`);
  }
  if (isRawResponse(data)) {
    throw new Error(`Invalid JSON response: ${data.raw.slice(0, 240)}`);
  }
  return data as T;
}

function safeParseJson(text: string): unknown {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function safeParseCachedToken(text: string): { accessToken?: string; expiresAt?: number } {
  try {
    const value = JSON.parse(text) as { accessToken?: unknown; expiresAt?: unknown };
    return {
      accessToken: typeof value.accessToken === "string" ? value.accessToken : undefined,
      expiresAt: typeof value.expiresAt === "number" ? value.expiresAt : undefined,
    };
  } catch {
    return {};
  }
}

function isRawResponse(value: unknown): value is { raw: string } {
  return (
    value !== null &&
    typeof value === "object" &&
    "raw" in value &&
    typeof (value as { raw?: unknown }).raw === "string"
  );
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

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function stripLineBreaks(text: string): string {
  return text
    .replace(/\r?\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function autoParagraph(text: string): string {
  const lines = text.split(/\r?\n/);
  const paragraphs: string[] = [];
  let buffer = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (buffer) {
        paragraphs.push(buffer.trim());
        buffer = "";
      }
      continue;
    }

    const endsWithPunctuation = endsWithSentencePunctuation(buffer);
    const startsWithCapitalOrNumber = /^[A-Z0-9（「『【(]/.test(trimmed);
    const isShortLine = buffer.length > 0 && buffer.length < 40;

    if (buffer && (endsWithPunctuation || startsWithCapitalOrNumber || isShortLine)) {
      paragraphs.push(buffer.trim());
      buffer = trimmed;
    } else {
      buffer = buffer ? `${buffer} ${trimmed}` : trimmed;
    }
  }

  if (buffer) paragraphs.push(buffer.trim());
  return paragraphs.join("\n\n");
}

function endsWithSentencePunctuation(text: string): boolean {
  const lastChar = text.trim().at(-1);
  return Boolean(lastChar && ".!?;:。！？；：…—”“」』）>]".includes(lastChar));
}
