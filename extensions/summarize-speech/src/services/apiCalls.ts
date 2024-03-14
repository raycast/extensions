import FormData from "form-data";
import fs from "fs";
import axios from "axios";
import {
  Preferences,
  Transcription,
  TranscriptionCache,
  TranscriptionResult,
  TranscriptionStatus,
} from "../interfaces";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import MistralClient from "@mistralai/mistralai";

const preferences = getPreferenceValues<Preferences>();
const gladiaApiKey = preferences.gladiaApiKey;
const mistralApiKey = preferences.mistralApiKey;
const mistralClient = new MistralClient(mistralApiKey);

async function uploadVoiceMemo(filePath: string): Promise<string> {
  const formData = new FormData();
  formData.append("audio", fs.createReadStream(filePath));

  const uploadResponse = await axios.post("https://api.gladia.io/v2/upload", formData, {
    headers: {
      ...formData.getHeaders(),
      "x-gladia-key": gladiaApiKey,
    },
  });
  return uploadResponse.data.audio_url;
}

async function requestTranscription(filePath: string): Promise<TranscriptionCache> {
  const audioUrl = await uploadVoiceMemo(filePath);
  const transcriptionRequest = {
    audio_url: audioUrl, // Use the audio URL obtained from the upload step
    diarization: true, // Enable speaker diarization
    enable_code_switching: true,
    context_prompt:
      "This is a noisy voice note, either to myself or a discussion with someone else. Please transcribe it into text.",
  };

  const transcriptionResponse = await axios.post("https://api.gladia.io/v2/transcription", transcriptionRequest, {
    headers: {
      "Content-Type": "application/json", // Specify JSON content type
      "x-gladia-key": gladiaApiKey,
    },
  });
  await showToast(Toast.Style.Animated, "Transcription in progress...");

  const { id: transcriptionId, result_url: resultUrl } = transcriptionResponse.data;
  const newCache: TranscriptionCache = {
    transcriptionId,
    resultUrl,
    transcriptionResult: null,
    title: "",
    summary: "",
    status: TranscriptionStatus.REQUESTED,
  };

  return Promise.resolve(newCache);
}

async function getTranscription(transcriptionId: string): Promise<TranscriptionResult> {
  try {
    let result;
    let isTranscriptionReady = false;

    while (!isTranscriptionReady) {
      const response = await axios.get(`https://api.gladia.io/v2/transcription/${transcriptionId}`, {
        headers: {
          "x-gladia-key": gladiaApiKey,
        },
      });

      result = response.data;
      if (result.status === "done") {
        isTranscriptionReady = true;
      } else {
        // Wait for some time before making another request
        await showToast(Toast.Style.Animated, "Transcription in progress...");
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds
      }
    }
    const predictions: Transcription[] = result.result.transcription.utterances;

    const sortedPredictions = predictions.sort((a, b) => a.end - b.start);

    const textTimestamps = sortedPredictions
      .map(
        (prediction) =>
          `[${prediction.start.toFixed(2)} - ${prediction.end.toFixed(2)}] Speaker${prediction.speaker}: ${prediction.text}`,
      )
      .join("\n\n");

    const textNoTimestamps = result.result.transcription.full_transcript;

    return { timestamps: textTimestamps, noTimestamps: textNoTimestamps };
  } catch (error) {
    console.error("Error retrieving transcription:", error);
    return;
  }
}

async function generateTitle(text: string): Promise<string> {
  try {
    const response = await mistralClient.chat({
      model: "mistral-tiny-2312",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant turning noisy voice notes into a very short title of 3-4 words. Do not output anything else.`,
        },
        {
          role: "user",
          content: `Generate a very short title of the following text on a single line:\n ${text}`,
        },
      ],
    });
    return response.choices[0].message.content.split("\n")[0];
  } catch (error) {
    console.error("Error generating title with Mistral AI:", error);
    throw error;
  }
}

async function generateSummary(
  summaryType: string,
  systemPrompt: string,
  userPrompt: string,
  text: string,
): Promise<string> {
  try {
    const response = await mistralClient.chat({
      model: "mistral-large-latest",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: `${userPrompt}:\n\n${text} ` },
      ],
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating summary with Mistral AI:", error);
    throw error;
  }
}

export { uploadVoiceMemo, requestTranscription, getTranscription, generateTitle, generateSummary };
