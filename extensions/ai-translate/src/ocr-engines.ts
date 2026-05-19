import { Cache } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { OcrCancelledError, OcrError, ScreenRecordingPermissionError } from "./ocr-errors";
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

/**
 * Capture a screen region and OCR it.
 *
 * Returns the recognized text, or `undefined` when the capture succeeded but
 * no text was found. Throws a typed error for the three actionable cases:
 * {@link OcrCancelledError} (user dismissed the selection — silent),
 * {@link ScreenRecordingPermissionError} (blank/unreadable capture), and
 * {@link OcrError} (everything else, with a cleaned message).
 */
export async function recognizeScreenshotText(preferences: ExtensionPreferences): Promise<string | undefined> {
  const imagePath = await captureScreenshotToFile();

  try {
    try {
      const text = await recognizeImageWithEngine(imagePath, preferences.ocrEngine, preferences);
      return formatOCRText(text, preferences) || undefined;
    } catch (error) {
      const canFallBack = preferences.ocrEngine !== "local" && preferences.ocrFallbackToLocal;
      if (canFallBack && !(error instanceof ScreenRecordingPermissionError)) {
        const text = await recognizeText(imagePath, getOCRTimeoutMs(preferences));
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

async function captureScreenshotToFile(): Promise<string> {
  const imagePath = join(tmpdir(), `raycast-ai-translate-${Date.now()}-${Math.random().toString(16).slice(2)}.png`);

  try {
    await execFileAsync("/usr/sbin/screencapture", ["-i", imagePath], {
      timeout: 90_000,
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    await unlink(imagePath).catch(() => undefined);
    if (isScreenshotCancelled(error)) {
      throw new OcrCancelledError();
    }

    throw new OcrError(`Screenshot capture failed: ${execErrorMessage(error)}`);
  }

  // screencapture exits 0 even when the user clicks without dragging (no file
  // written) — that is a cancel, not a failure.
  const fileSize = await fileSizeBytes(imagePath);
  if (fileSize === 0) {
    await unlink(imagePath).catch(() => undefined);
    throw new OcrCancelledError();
  }

  await assertReadableImage(imagePath, fileSize);
  return imagePath;
}

/**
 * A non-empty file that macOS cannot decode as an image means screencapture
 * wrote a blank/locked frame — the signature of a missing Screen Recording
 * grant on macOS 14.4+. `sips` exit codes are unreliable, but a numeric
 * `pixelWidth` is a dependable validity signal.
 */
async function assertReadableImage(imagePath: string, sizeBytes: number): Promise<void> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("/usr/bin/sips", ["-g", "pixelWidth", imagePath], {
      timeout: 5_000,
      maxBuffer: 64 * 1024,
    }));
  } catch {
    // Probe itself failed (sips unavailable / odd path) — don't block on it,
    // let the OCR engine be the final judge of the file.
    return;
  }

  const width = Number.parseInt(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] ?? "", 10);
  if (!Number.isFinite(width) || width <= 0) {
    await unlink(imagePath).catch(() => undefined);
    const sipsHint = stdout.replace(/\s+/g, " ").trim().slice(0, 80) || "no dimensions";
    throw new ScreenRecordingPermissionError(`capture ${sizeBytes}B, sips: ${sipsHint}`);
  }
}

async function fileSizeBytes(path: string): Promise<number> {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

function isScreenshotCancelled(error: unknown): boolean {
  const code = execErrorCode(error);
  const stderr = execErrorStderr(error).trim();
  const message = execErrorMessage(error).toLowerCase();

  return message.includes("cancel") || (code === 1 && stderr.length === 0);
}

function execErrorCode(error: unknown): number | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : undefined;
  }

  return undefined;
}

function execErrorStderr(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error) {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === "string") return stderr;
    if (Buffer.isBuffer(stderr)) return stderr.toString("utf8");
  }

  return "";
}

function execErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    const stderr = execErrorStderr(error).trim();
    return stderr || error.message;
  }

  const text = String(error).trim();
  if (text) {
    return text;
  }

  return "Unknown error";
}

async function recognizeImageWithEngine(
  imagePath: string,
  engine: OCREngine,
  preferences: ExtensionPreferences,
): Promise<string> {
  switch (engine) {
    case "local":
      return (await recognizeText(imagePath, getOCRTimeoutMs(preferences))) ?? "";
    case "tesseract":
      return recognizeWithTesseract(imagePath, preferences);
    case "baidu":
      return recognizeWithBaidu(imagePath, preferences);
    case "gemini":
      return recognizeWithGemini(imagePath, preferences);
  }
}

const GEMINI_OCR_PROMPT =
  "Extract all text from this image exactly as it appears. Preserve the original reading " +
  "order and line breaks. Output only the extracted text — no commentary, no explanations, " +
  "and no Markdown code fences. If the image contains no text, output nothing.";

interface GeminiOCRResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string; status?: string };
  promptFeedback?: { blockReason?: string };
}

async function recognizeWithGemini(imagePath: string, preferences: ExtensionPreferences): Promise<string> {
  const apiKey = preferences.geminiAPIKey?.trim();
  if (!apiKey) {
    throw new OcrError("Gemini API key is not configured. Add it in Extension Preferences to use Gemini OCR.");
  }

  const baseURL = preferences.geminiBaseURL?.trim() || "https://generativelanguage.googleapis.com/v1beta";
  const model = preferences.geminiOcrModel?.trim() || preferences.geminiModel?.trim() || "gemini-2.5-flash";
  const image = (await readFile(imagePath)).toString("base64");

  const response = await fetchWithTimeout(geminiOcrUrl(baseURL, model), getOCRTimeoutMs(preferences), {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ inline_data: { mime_type: "image/png", data: image } }, { text: GEMINI_OCR_PROMPT }],
        },
      ],
      generationConfig: { temperature: 0 },
    }),
  });

  const body = await response.text();
  const data = safeParseJson(body) as GeminiOCRResponse;

  if (!response.ok || data.error?.message) {
    const message = data.error?.message ?? `HTTP ${response.status}: ${body.slice(0, 200)}`;
    if (/model/i.test(message) && /(not found|not exist|unsupported|no access|not available)/i.test(message)) {
      throw new OcrError(
        `Gemini rejected model "${model}". Set a valid multimodal model in Extension Preferences (Gemini OCR Model).`,
      );
    }
    if (data.promptFeedback?.blockReason) {
      throw new OcrError(`Gemini blocked the image (${data.promptFeedback.blockReason}).`);
    }
    throw new OcrError(message);
  }

  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function geminiOcrUrl(baseURL: string, model: string): string {
  const trimmed = baseURL.replace(/\/+$/, "");
  const name = model.replace(/^models\//, "");
  return `${trimmed}/models/${encodeURIComponent(name)}:generateContent`;
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
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Reflow OCR text into paragraphs. OCR engines emit one hard line break per
 * visual line, so wrapped prose arrives shredded. We rejoin soft-wrapped
 * lines and only start a new paragraph on reliable signals: a blank line, a
 * short line that ends a sentence (a paragraph's last line is rarely
 * full-width), or an obvious list/heading marker.
 */
export function autoParagraph(text: string): string {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const widths = lines.filter(Boolean).map((line) => line.length);
  if (widths.length === 0) {
    return "";
  }

  const maxLen = Math.max(...widths);
  const paragraphs: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length > 0) {
      paragraphs.push(joinParagraphLines(current));
      current = [];
    }
  };

  for (const line of lines) {
    if (!line) {
      flush();
      continue;
    }

    if (current.length > 0) {
      const prev = current[current.length - 1];
      const shortSentenceEnd = endsSentence(prev) && prev.length < maxLen * 0.66;
      if (isListOrHeading(line) || shortSentenceEnd) {
        flush();
      }
    }

    current.push(line);
  }

  flush();
  return paragraphs.join("\n\n");
}

function joinParagraphLines(lines: string[]): string {
  return lines
    .reduce((acc, next) => {
      if (!acc) {
        return next;
      }
      if (/[A-Za-z]-$/.test(acc) && /^[a-z]/.test(next)) {
        return acc.slice(0, -1) + next; // de-hyphenate an OCR word wrap
      }
      if (isCJKChar(acc.at(-1)) && isCJKChar(next[0])) {
        return acc + next; // CJK has no inter-word spaces
      }
      return `${acc} ${next}`;
    }, "")
    .trim();
}

function endsSentence(line: string): boolean {
  const trimmed = line.replace(/[)\]）】」』”’》>]+$/u, "").trimEnd();
  const last = trimmed.at(-1) ?? "";
  return ".!?。！？…".includes(last);
}

function isListOrHeading(line: string): boolean {
  return /^([-*•·–—]\s|\d+[.)、．]\s?|[(（]\d+[)）]|[a-z][.)]\s|[#＃]+\s|第[一二三四五六七八九十百千零\d]+[章节條条款项篇部话]|[一二三四五六七八九十]+[、.])/.test(
    line,
  );
}

function isCJKChar(char: string | undefined): boolean {
  if (!char) {
    return false;
  }
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x3000 && code <= 0x303f) || // CJK punctuation
    (code >= 0x3040 && code <= 0x30ff) || // kana
    (code >= 0x3400 && code <= 0x9fff) || // CJK ideographs
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul
    (code >= 0xf900 && code <= 0xfaff) || // CJK compat
    (code >= 0xff00 && code <= 0xffef) //  fullwidth/halfwidth forms
  );
}
