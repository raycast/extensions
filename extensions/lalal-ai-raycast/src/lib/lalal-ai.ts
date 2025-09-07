import FormData from "form-data";
import {
  UploadResponse,
  SplitParams,
  SplitResponse,
  CheckResponse,
  VoiceChangeParams,
  VoiceChangeResponse,
  VoicePacksResponse,
  BillingLimits,
} from "../types/lalal-ai";

export class LalalAI {
  private apiKey: string;
  private baseUrl = "https://www.lalal.ai";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `license ${this.apiKey}`,
    };
  }

  async uploadFile(
    filePath: string,
    filename: string,
  ): Promise<UploadResponse> {
    const fs = require("fs");
    const fileBuffer = fs.readFileSync(filePath);

    const response = await fetch(`${this.baseUrl}/api/upload/`, {
      method: "POST",
      headers: {
        ...this.getHeaders(),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/octet-stream",
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      throw new Error(
        `Upload failed: ${response.status} ${response.statusText}`,
      );
    }

    const result = (await response.json()) as UploadResponse;
    if (result.status === "error") {
      throw new Error(result.error || "Upload failed");
    }

    return result;
  }

  async splitAudio(params: SplitParams[]): Promise<SplitResponse> {
    // According to Lalal.ai API docs, params should be JSON-encoded string
    // Example from docs: --form-string 'params=[{"id": "9a3ae258-7693-4046-87c2-ef577eb752bb", "stem": "piano"}]'
    const paramsJson = JSON.stringify(params);

    // Use URLSearchParams for form-encoded data instead of FormData
    const formData = new URLSearchParams();
    formData.append("params", paramsJson);

    // Debug: log what we're sending
    console.log("Sending split params JSON:", paramsJson);

    const response = await fetch(`${this.baseUrl}/api/split/`, {
      method: "POST",
      headers: {
        ...this.getHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    console.log("API Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Split request failed:",
        response.status,
        response.statusText,
        errorText,
      );
      throw new Error(
        `Split request failed: ${response.status} ${response.statusText}`,
      );
    }

    const result = (await response.json()) as SplitResponse;
    console.log("API Response result:", JSON.stringify(result, null, 2));

    if (result.status === "error") {
      console.error("Split API error:", result.error);
      throw new Error(result.error || "Split processing failed");
    }

    return result;
  }

  async checkTaskStatus(fileIds: string[]): Promise<CheckResponse> {
    // Use URLSearchParams for form-encoded data like the split endpoint
    const formData = new URLSearchParams();
    formData.append("id", fileIds.join(","));

    console.log("Checking task status for IDs:", fileIds.join(","));

    const response = await fetch(`${this.baseUrl}/api/check/`, {
      method: "POST",
      headers: {
        ...this.getHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = (await response.json()) as CheckResponse;
    console.log("Task status result:", JSON.stringify(result, null, 2));

    return result;
  }

  async changeVoice(params: VoiceChangeParams): Promise<VoiceChangeResponse> {
    const formData = new FormData();
    formData.append("id", params.id);
    formData.append("voice", params.voice);

    if (params.accent_enhance !== undefined) {
      formData.append("accent_enhance", params.accent_enhance.toString());
    }
    if (params.pitch_shifting !== undefined) {
      formData.append("pitch_shifting", params.pitch_shifting.toString());
    }
    if (params.dereverb_enabled !== undefined) {
      formData.append("dereverb_enabled", params.dereverb_enabled.toString());
    }

    const response = await fetch(`${this.baseUrl}/api/change_voice/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: formData,
    });

    return (await response.json()) as VoiceChangeResponse;
  }

  async getVoicePacks(): Promise<VoicePacksResponse> {
    const response = await fetch(`${this.baseUrl}/api/voice_packs/list/`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    return (await response.json()) as VoicePacksResponse;
  }

  async getBillingLimits(): Promise<BillingLimits> {
    const response = await fetch(
      `${this.baseUrl}/billing/get-limits/?key=${this.apiKey}`,
      {
        method: "GET",
      },
    );

    return (await response.json()) as BillingLimits;
  }

  async cancelTask(
    fileIds: string[],
  ): Promise<{ status: "success" | "error"; error?: string }> {
    const formData = new FormData();
    formData.append("id", fileIds.join(","));

    const response = await fetch(`${this.baseUrl}/api/cancel/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: formData,
    });

    return (await response.json()) as {
      status: "success" | "error";
      error?: string;
    };
  }

  async downloadFile(url: string, outputPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Download failed: ${response.status} ${response.statusText}`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    require("fs").writeFileSync(outputPath, buffer);
  }
}
