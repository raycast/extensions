import { API_BASE_URL } from "./constants";
import { Chapter, Recitation, AudioFile, Ayah, VerseRecitation } from "../types";
import { LocalStorage } from "@raycast/api";

async function callApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function fetchChapters(): Promise<Chapter[]> {
  const cached = await LocalStorage.getItem<string>("cached_chapters");
  if (cached) {
    // Surahs are constant, so if we have them, return them immediately.
    return JSON.parse(cached);
  }
  try {
    const data = await callApi<{ chapters: Chapter[] }>(`${API_BASE_URL}/chapters`);
    await LocalStorage.setItem("cached_chapters", JSON.stringify(data.chapters));
    return data.chapters;
  } catch (error) {
    if (cached) return JSON.parse(cached);
    throw error;
  }
}

export async function fetchRecitations(): Promise<Recitation[]> {
  const cached = await LocalStorage.getItem<string>("cached_recitations");
  if (cached) {
    return JSON.parse(cached);
  }
  try {
    const data = await callApi<{ recitations: Recitation[] }>(`${API_BASE_URL}/resources/recitations`);
    await LocalStorage.setItem("cached_recitations", JSON.stringify(data.recitations));
    return data.recitations;
  } catch (error) {
    if (cached) return JSON.parse(cached);
    throw error;
  }
}

export async function fetchAudioFile(
  reciterId: number,
  chapterId: number,
  options: Record<string, string> = {},
): Promise<AudioFile> {
  const query = new URLSearchParams(options).toString();
  const url = `${API_BASE_URL}/chapter_recitations/${reciterId}/${chapterId}${query ? `?${query}` : ""}`;
  const data = await callApi<{ audio_file: AudioFile }>(url);
  return data.audio_file;
}

export async function fetchVerses(chapterId: number): Promise<Ayah[]> {
  const cacheKey = `cached_verses_${chapterId}`;
  const cached = await LocalStorage.getItem<string>(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  const data = await callApi<{ verses: Ayah[] }>(
    `${API_BASE_URL}/verses/by_chapter/${chapterId}?language=en&words=false&per_page=300`,
  );
  await LocalStorage.setItem(cacheKey, JSON.stringify(data.verses));
  return data.verses;
}

export async function fetchVerseRecitations(reciterId: number, chapterId: number): Promise<VerseRecitation[]> {
  const data = await callApi<{ audio_files: VerseRecitation[] }>(
    `${API_BASE_URL}/recitations/${reciterId}/by_chapter/${chapterId}?per_page=300`,
  );
  return data.audio_files.map((file) => ({
    ...file,
    url: file.url.startsWith("http") ? file.url : `https://audio.qurancdn.com/${file.url}`,
  }));
}
