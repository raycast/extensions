import { getPreferenceValues } from "@raycast/api";
import { request as httpRequest } from "node:http";

// HTTP requests have no inference deadline; long files can take more than five minutes.
function localRequest(
  url: string,
  options: RequestInit,
): Promise<{ ok: boolean; status: number; statusText: string; text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      {
        method: options.method ?? "GET",
        headers: options.headers as Record<string, string>,
        signal: options.signal ?? undefined,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("error", reject);
        response.on("aborted", () =>
          reject(new Error("FluidVoice closed the connection before the full response arrived.")),
        );
        response.on("end", () => {
          if (!response.complete) {
            reject(new Error("Incomplete HTTP response from FluidVoice."));
            return;
          }
          const status = response.statusCode ?? 500;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: response.statusMessage ?? "",
            text: async () => Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    request.on("error", reject);
    request.end(options.body as string | undefined);
  });
}

export interface HealthResponse {
  status: "ok";
  version: string;
}

export interface TranscriptionResponse {
  text: string;
  confidence: number;
  sampleCount: number;
  provider: string;
}

export class FluidVoiceAPI {
  private static readonly requestTimeoutMs = 15_000;
  private static get baseUrl(): string {
    const { fluidVoicePort } = getPreferenceValues<Preferences>();
    const port = fluidVoicePort?.trim() || "47733";
    if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
      throw new Error("Invalid FluidVoice API port.");
    return `http://127.0.0.1:${port}`;
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}, timeoutMs?: number): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = timeoutMs ? new AbortController() : undefined;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

    try {
      console.log(`[FluidVoice] ${options.method || "GET"} ${url}`);
      const response = await localRequest(url, {
        ...options,
        signal: controller?.signal ?? options.signal,
      });
      const body = await response.text();

      if (!response.ok) {
        let message = body;
        try {
          message = (JSON.parse(body) as { error?: string }).error || body;
        } catch {
          // The API may return plain text for malformed requests.
        }
        throw new Error(message || `${response.status} ${response.statusText}`);
      }

      if (!body) return undefined as T;
      return JSON.parse(body) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (controller?.signal.aborted) {
        throw new Error(`Timed out after ${(timeoutMs ?? 0) / 1000}s connecting to FluidVoice at ${this.baseUrl}.`);
      }
      if (
        message.includes("ECONNREFUSED") ||
        message.includes("Failed to connect") ||
        message.includes("fetch failed")
      ) {
        throw new Error(
          `Could not connect to FluidVoice at ${this.baseUrl}. Ensure FluidVoice is running and its Local API is enabled.`,
        );
      }
      throw new Error(`FluidVoice request failed: ${message}`);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  static async health(): Promise<HealthResponse> {
    const result = await this.request<HealthResponse>("/v1/health", {}, this.requestTimeoutMs);
    if (result?.status !== "ok" || typeof result.version !== "string")
      throw new Error("Invalid health response from FluidVoice. Check the Local API port.");
    return result;
  }

  static async history(): Promise<{
    items: { id: string; timestamp: string; finalText: string; originalText: string; appName: string }[];
  }> {
    const result = await this.request<{
      items: { id: string; timestamp: string; finalText: string; originalText: string; appName: string }[];
    }>("/v1/history?limit=100", {}, this.requestTimeoutMs);
    if (
      !Array.isArray(result?.items) ||
      result.items.some(
        (item) =>
          !item ||
          [item.id, item.timestamp, item.finalText, item.originalText, item.appName].some(
            (value) => typeof value !== "string",
          ),
      )
    )
      throw new Error("Invalid history response from FluidVoice.");
    return result;
  }

  static async transcribeFile(filePath: string, signal?: AbortSignal): Promise<TranscriptionResponse> {
    const result = await this.request<TranscriptionResponse>("/v1/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
      signal,
    });
    if (
      typeof result?.text !== "string" ||
      typeof result.provider !== "string" ||
      !Number.isFinite(result.confidence) ||
      !Number.isSafeInteger(result.sampleCount) ||
      result.sampleCount < 0
    )
      throw new Error("Invalid transcription response from FluidVoice.");
    if (!result.text.trim()) throw new Error("FluidVoice returned no speech for this file.");
    return result;
  }
}
