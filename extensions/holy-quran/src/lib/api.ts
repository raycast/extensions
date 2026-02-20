import { API_BASE_URL } from "./constants";
import { Chapter, Recitation, AudioFile, Ayah, VerseRecitation } from "../types";

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
  const data = await callApi<{ chapters: Chapter[] }>(`${API_BASE_URL}/chapters`);
  return data.chapters;
}

export async function fetchRecitations(): Promise<Recitation[]> {
  const data = await callApi<{ recitations: Recitation[] }>(`${API_BASE_URL}/resources/recitations`);
  return data.recitations;
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
  const data = await callApi<{ verses: Ayah[] }>(
    `${API_BASE_URL}/verses/by_chapter/${chapterId}?language=en&words=false&per_page=300`,
  );
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
