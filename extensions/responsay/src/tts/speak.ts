import { extname } from "node:path";
import type { ProviderName } from "../llm/config";
import type { TtsPrefs } from "./types";
import {
  resolveTtsProvider,
  resolveTtsConfig,
  buildTtsInstructions,
} from "./index";
import { synthesizeOpenAI } from "./openai";
import { synthesizeQwen } from "./qwen";
import { synthesizeMimo } from "./mimo";
import { synthesizeGemini } from "./gemini";
import {
  audioCacheKey,
  cachedAudioPath,
  writeAudioCache,
  playAudio,
  loopPlay,
  exportToDownloads,
} from "./playback";

let lastPlayedPath: string | null = null;

async function synthCached(
  text: string,
  analysisProvider: ProviderName,
  prefs: TtsPrefs,
  rate: number,
): Promise<string> {
  const provider = resolveTtsProvider(analysisProvider, prefs);
  const cfg = resolveTtsConfig(provider, prefs);
  const key = audioCacheKey({
    text,
    provider,
    model: cfg.model,
    voice: cfg.voice,
    rate,
  });
  let path = cachedAudioPath(key, "wav") ?? cachedAudioPath(key, "mp3");
  if (!path) {
    const opts = { rate, instructions: buildTtsInstructions(rate) };
    const result =
      provider === "openai"
        ? await synthesizeOpenAI(text, opts, cfg)
        : provider === "mimo"
          ? await synthesizeMimo(text, opts, cfg)
          : provider === "gemini"
            ? await synthesizeGemini(text, opts, cfg)
            : await synthesizeQwen(text, opts, cfg);
    path = await writeAudioCache(key, result.ext, result.bytes);
  }
  return path;
}

export async function speak(
  text: string,
  analysisProvider: ProviderName,
  prefs: TtsPrefs,
  rate: number,
): Promise<void> {
  const path = await synthCached(text, analysisProvider, prefs, rate);
  lastPlayedPath = path;
  await playAudio(path);
}

export async function speakLoop(
  text: string,
  analysisProvider: ProviderName,
  prefs: TtsPrefs,
  times: number,
  gapMs: number,
): Promise<void> {
  const path = await synthCached(text, analysisProvider, prefs, 1);
  lastPlayedPath = path;
  await loopPlay(path, times, gapMs);
}

export async function exportAudio(
  text: string,
  analysisProvider: ProviderName,
  prefs: TtsPrefs,
): Promise<string> {
  const path = await synthCached(text, analysisProvider, prefs, 1);
  const slug =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "clip";
  const ext = extname(path).replace(".", "") || "wav";
  return exportToDownloads(path, `responsay-${slug}.${ext}`);
}

export async function repeatLast(): Promise<boolean> {
  if (!lastPlayedPath) return false;
  await playAudio(lastPlayedPath);
  return true;
}
