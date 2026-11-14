import { openAsBlob } from "fs";
import { ProviderError, TranscriptionOptions, TranscriptionResult, TranscriptionSegment } from "../types";
import { getApiKey, getExtensionPreferences } from "../preferences";

interface ElevenLabsWord {
  text: string;
  start: number;
  end: number;
  type: "word" | "spacing" | "audio_event";
  speaker_id?: string;
}

interface ElevenLabsResponse {
  language_code?: string;
  language_probability?: number;
  text: string;
  words: ElevenLabsWord[];
}

export async function transcribeWithElevenLabs(options: TranscriptionOptions): Promise<TranscriptionResult> {
  const prefs = getExtensionPreferences();
  const apiKey = getApiKey("elevenlabs", prefs);

  const fileBlob = openAsBlob(options.filePath);
  const form = new FormData();
  form.append("file", fileBlob, options.filePath.split("/").pop() || "audio");
  form.append("model_id", "scribe_v2");
  form.append("diarize", options.diarization ? "true" : "false");

  if (options.language && options.language.trim().length > 0) {
    form.append("language_code", options.language.trim());
  }

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: form,
    signal: options.signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ProviderError(`ElevenLabs error ${response.status}: ${body}`, "elevenlabs");
  }

  const data = (await response.json()) as ElevenLabsResponse;
  const segments = buildSegments(data.words || []);

  return {
    text: data.text,
    segments: segments.length > 0 ? segments : undefined,
    language: data.language_code,
  };
}

function buildSegments(words: ElevenLabsWord[]): TranscriptionSegment[] {
  const segments: TranscriptionSegment[] = [];
  let currentSpeaker: string | undefined;
  let currentText = "";
  let start: number | undefined;
  let end: number | undefined;

  const pushSegment = () => {
    if (currentText.trim().length > 0) {
      segments.push({
        speaker: currentSpeaker ? speakerLabel(currentSpeaker) : undefined,
        start,
        end,
        text: currentText.trim(),
      });
    }
  };

  for (const word of words) {
    if (word.type !== "word") {
      if (word.type === "spacing" && currentText.length > 0) {
        currentText += " ";
      }
      continue;
    }

    if (currentSpeaker !== undefined && word.speaker_id !== currentSpeaker) {
      pushSegment();
      currentText = "";
      start = undefined;
      end = undefined;
    }

    currentSpeaker = word.speaker_id;
    currentText += word.text;
    start = start ?? word.start;
    end = word.end;
  }

  pushSegment();
  return segments;
}

function speakerLabel(speakerId: string): string {
  const index = parseInt(speakerId.replace("speaker_", ""), 10);
  return isNaN(index) ? speakerId : `Speaker ${index + 1}`;
}
