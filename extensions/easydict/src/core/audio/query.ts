/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { englishLanguageItem } from "@/core/language/consts";
import type { QueryWordInfo } from "@/types/query";
import { logTrace } from "@/utils/logger";

import { downloadAudio, downloadWordAudioWithURL } from "./downloader";
import { playWordAudio } from "./player";

/**
 * Download query word audio.
 *
 * If query text has a speech URL, download from that.
 * Otherwise if it's an English word, download from Youdao TTS.
 * Returns the local file path if successfully downloaded.
 */
async function downloadQueryWordAudio(
  queryWordInfo: QueryWordInfo,
  options?: { enableYoudaoWebAudio?: boolean; signal?: AbortSignal },
): Promise<string | undefined> {
  const { enableYoudaoWebAudio = true, signal } = options || {};
  if (queryWordInfo.speechUrl) {
    return await downloadWordAudioWithURL(queryWordInfo.word, queryWordInfo.speechUrl, { signal });
  } else if (
    enableYoudaoWebAudio &&
    queryWordInfo.isWord &&
    queryWordInfo.fromLanguage === englishLanguageItem.youdaoLangCode
  ) {
    return await downloadTTSWordAudio(queryWordInfo.word, signal);
  } else {
    logTrace("AudioQuery", "use say command to play directly");
    return undefined;
  }
}

/**
 * Download English word audio from Youdao TTS.
 */
async function downloadTTSWordAudio(word: string, signal?: AbortSignal): Promise<string | undefined> {
  const url = `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`;
  logTrace("AudioQuery", `download english word audio: ${word}`);
  return await downloadAudio(url, { signal });
}

/**
 * Download query word audio and play after download.
 */
export async function playQueryWordAudio(
  queryWordInfo: QueryWordInfo,
  options?: { enableYoudaoWebAudio?: boolean; signal?: AbortSignal },
): Promise<void> {
  const { enableYoudaoWebAudio = true, signal } = options || {};
  const audioPath = await downloadQueryWordAudio(queryWordInfo, { enableYoudaoWebAudio, signal });
  await playWordAudio(queryWordInfo.word, queryWordInfo.fromLanguage, { audioPath, signal });
}
