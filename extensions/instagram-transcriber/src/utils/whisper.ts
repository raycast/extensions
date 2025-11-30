import FormData from "form-data";
import fs from "fs";
import axios from "axios";

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeWithWhisper(
  audioPath: string,
  apiKey: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", fs.createReadStream(audioPath));
  form.append("model", "whisper-1");
  form.append("response_format", "text");

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${apiKey}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 300000, // 5 minute timeout for long videos
      },
    );

    return response.data;
  } catch (error) {
    const axiosError = error as {
      response?: { status?: number };
      message?: string;
    };
    if (axiosError.response?.status === 401) {
      throw new Error("Invalid Whisper API key");
    } else if (axiosError.response?.status === 413) {
      throw new Error("Video file too large for Whisper API (max 25MB)");
    } else if (axiosError.response?.status === 429) {
      throw new Error(
        "Whisper API rate limit exceeded. Please try again later.",
      );
    }

    const errorMessage = axiosError.message || "Unknown error";
    throw new Error(`Whisper API error: ${errorMessage}`);
  }
}

/**
 * Split large audio files for Whisper API (25MB limit)
 */
export async function splitAndTranscribe(
  audioPath: string,
  apiKey: string,
): Promise<string> {
  // Implementation for splitting large files
  // This would use ffmpeg to split audio into chunks
  // and then combine transcripts

  // Placeholder for now - would implement if needed
  return transcribeWithWhisper(audioPath, apiKey);
}
