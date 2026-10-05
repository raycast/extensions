import { ProviderError, TranscriptionOptions, TranscriptionResult, TranscriptionSegment } from "../types";
import { formatMimeType } from "../utils/audio";
import { fileStreamToWeb } from "../utils/streams";
import { getApiKey, getExtensionPreferences } from "../preferences";

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  punctuated_word?: string;
  speaker?: number;
}

interface DeepgramAlternative {
  transcript: string;
  words: DeepgramWord[];
}

interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

interface DeepgramResponse {
  metadata?: {
    duration?: number;
  };
  results?: {
    channels?: DeepgramChannel[];
  };
}

export async function transcribeWithDeepgram(options: TranscriptionOptions): Promise<TranscriptionResult> {
  const prefs = getExtensionPreferences();
  const apiKey = getApiKey("deepgram", prefs);

  const params = new URLSearchParams();
  params.append("model", "nova-3");
  params.append("smart_format", "true");
  params.append("punctuate", "true");

  if (options.diarization) {
    params.append("diarize", "true");
    params.append("diarize_model", "latest");
  }

  if (options.language && options.language.trim().length > 0) {
    params.append("language", options.language.trim());
  }

  const response = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": formatMimeType(options.filePath, "deepgram"),
    },
    body: fileStreamToWeb(options.filePath),
    signal: options.signal,
    duplex: "half",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ProviderError(`Deepgram error ${response.status}: ${body}`, "deepgram");
  }

  const data = (await response.json()) as DeepgramResponse;
  const channel = data.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  if (!alternative) {
    throw new ProviderError("Deepgram returned no transcription alternatives.", "deepgram");
  }

  const segments: TranscriptionSegment[] = [];
  let currentSpeaker: number | undefined;
  let currentWords: DeepgramWord[] = [];

  for (const word of alternative.words || []) {
    if (options.diarization && word.speaker !== undefined) {
      if (currentSpeaker !== undefined && word.speaker !== currentSpeaker) {
        segments.push(buildSegment(currentWords, currentSpeaker, options.diarization));
        currentWords = [];
      }
      currentSpeaker = word.speaker;
    }
    currentWords.push(word);
  }

  if (currentWords.length > 0) {
    segments.push(buildSegment(currentWords, currentSpeaker, options.diarization));
  }

  return {
    text: alternative.transcript,
    segments: segments.length > 0 ? segments : undefined,
    duration: data.metadata?.duration,
  };
}

function buildSegment(
  words: DeepgramWord[],
  speaker: number | undefined,
  includeSpeaker: boolean,
): TranscriptionSegment {
  const text = words.map((w) => w.punctuated_word ?? w.word).join(" ");
  return {
    speaker: includeSpeaker && speaker !== undefined ? `Speaker ${speaker + 1}` : undefined,
    start: words[0]?.start,
    end: words[words.length - 1]?.end,
    text,
  };
}
