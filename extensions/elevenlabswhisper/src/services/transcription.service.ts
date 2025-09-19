import fs from "node:fs";
import path from "node:path";
import { getPreferenceValues } from "@raycast/api";

type Provider = Preferences["provider"];

export type TranscriptionResponse = {
  text?: string;
  [key: string]: unknown;
};

export class TranscriptionError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
  ) {
    super(message);
    this.name = "TranscriptionError";
  }
}

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

class TranscriptionService {
  private getPrefs() {
    const pref = getPreferenceValues<Preferences>();
    const provider: Provider = (pref?.provider as Provider) || "elevenlabs";
    const modelId = pref?.modelId?.trim() || "scribe_v1";
    return { provider, modelId, pref };
  }

  private buildFormData(filePath: string, modelId: string): FormData {
    const form = new FormData();
    form.append("model_id", modelId);
    const filename = path.basename(filePath) || "recording.wav";
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer], { type: "audio/wav" });
    form.append("file", blob, filename);
    return form;
  }

  async transcribe(filePath: string): Promise<string> {
    const { provider, modelId, pref } = this.getPrefs();
    let endpoint: string;
    let headers: Record<string, string>;

    if (provider === "elevenlabs") {
      const apiKey = pref?.elevenlabsApiKey?.trim();
      if (!apiKey) throw new TranscriptionError("Missing ElevenLabs API key", "AUTH_MISSING");
      endpoint = "https://api.elevenlabs.io/v1/speech-to-text";
      headers = { "xi-api-key": apiKey };
    } else {
      const baseUrl = pref?.ai302ApiBaseUrl?.trim();
      const apiKey = pref?.ai302ApiKey?.trim();
      if (!baseUrl) throw new TranscriptionError("Missing 302.ai Base URL", "BASEURL_MISSING");
      if (!apiKey) throw new TranscriptionError("Missing 302.ai API key", "AUTH_MISSING");
      endpoint = baseUrl;
      headers = { Authorization: `Bearer ${apiKey}` };
    }

    const form = this.buildFormData(filePath, modelId);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: form,
      });
      return await this.handleResponse(res, provider);
    } catch {
      throw new TranscriptionError(`[${provider}] Network request failed`, "NETWORK_ERROR", undefined);
    }
  }

  private async handleResponse(res: Response, provider: Provider): Promise<string> {
    if (!res.ok) {
      const status = res.status;
      let errorMsg = `HTTP Error ${status}`;
      try {
        const errorBody = (await res.json()) as ApiErrorResponse;
        errorMsg = errorBody?.message || errorBody?.error || JSON.stringify(errorBody);
      } catch {
        errorMsg = await res.text().catch(() => errorMsg);
      }
      const code = status === 401 || status === 403 ? "AUTH_FAILED" : "HTTP_ERROR";
      throw new TranscriptionError(`[${provider}] ${errorMsg}`, code, status);
    }

    const data = (await res.json()) as TranscriptionResponse;
    if (typeof data.text !== "string") {
      throw new TranscriptionError(
        "Invalid API response: 'text' field is missing or not a string.",
        "INVALID_RESPONSE",
      );
    }
    return data.text;
  }
}

export const transcriptionService = new TranscriptionService();
