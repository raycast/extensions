import { AI, Clipboard, LocalStorage, environment } from "@raycast/api";
import { exportAudio } from "./audio";
import { GENERATED_AUDIO_KEY, GENERATED_TEXT_KEY, MAX_CLIPBOARD_HISTORY_OFFSET } from "./constants";
import { captureWordsFromTexts, getDailyLog } from "./storage";
import { CaptureResult } from "./types";
import { createFallbackStudyText } from "./word-utils";

export interface StudyGenerationResult {
  words: string[];
  text: string;
  audioPath?: string;
  captureResult?: CaptureResult;
}

export async function importRecentHistory(lowercase = true): Promise<CaptureResult> {
  const historyTexts = await Promise.all(
    Array.from({ length: MAX_CLIPBOARD_HISTORY_OFFSET + 1 }, (_, offset) => Clipboard.readText({ offset })),
  );

  return captureWordsFromTexts(historyTexts, "clipboard-history", lowercase);
}

export async function generateStudyTextFromWords(words: string[]): Promise<string> {
  if (words.length === 0) {
    const emptyText = createFallbackStudyText(words);
    await LocalStorage.setItem(GENERATED_TEXT_KEY, emptyText);
    return emptyText;
  }

  let nextText = createFallbackStudyText(words);

  if (environment.canAccess(AI)) {
    const prompt = [
      "You are helping an English learner memorize vocabulary.",
      "Write one short, natural practice paragraph in English.",
      "Use as many of these words as possible exactly as written.",
      "Keep it to 4-6 sentences, easy to read aloud, and coherent.",
      `Words: ${words.join(", ")}`,
    ].join("\n");

    nextText = await AI.ask(prompt);
  }

  await LocalStorage.setItem(GENERATED_TEXT_KEY, nextText);
  return nextText;
}

export async function exportStudyAudio(text: string): Promise<string> {
  const audioPath = await exportAudio(text);
  await LocalStorage.setItem(GENERATED_AUDIO_KEY, audioPath);
  return audioPath;
}

export async function getSavedStudyArtifacts(): Promise<{ text?: string; audioPath?: string }> {
  const [text, audioPath] = await Promise.all([
    LocalStorage.getItem<string>(GENERATED_TEXT_KEY),
    LocalStorage.getItem<string>(GENERATED_AUDIO_KEY),
  ]);

  return {
    text: text ?? undefined,
    audioPath: audioPath ?? undefined,
  };
}

export async function runOneClickDailyReview(lowercase = true): Promise<StudyGenerationResult> {
  const captureResult = await importRecentHistory(lowercase);
  const dailyLog = await getDailyLog();
  const words = dailyLog.words.map((entry) => entry.word);
  const text = await generateStudyTextFromWords(words);
  const audioPath = words.length > 0 ? await exportStudyAudio(text) : undefined;

  return {
    words,
    text,
    audioPath,
    captureResult,
  };
}
