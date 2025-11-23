import { LocalStorage } from "@raycast/api";
import type { ImgBedFileItem } from "../types/files";

const GALLERY_KEY = "tag-gallery-frequency";
const USER_KEY = "tag-user-frequency";

type FrequencyMap = Record<string, number>;

async function readFrequency(key: string): Promise<FrequencyMap> {
  try {
    const value = await LocalStorage.getItem<string>(key);
    if (!value) {
      return {};
    }
    return JSON.parse(value) as FrequencyMap;
  } catch {
    return {};
  }
}

async function writeFrequency(key: string, data: FrequencyMap) {
  await LocalStorage.setItem(key, JSON.stringify(data));
}

export async function syncGalleryTagFrequency(files: ImgBedFileItem[]) {
  const counts: FrequencyMap = {};
  for (const file of files) {
    file.metadata.tags?.forEach((tag) => {
      const normalized = tag.toLowerCase();
      counts[normalized] = (counts[normalized] ?? 0) + 1;
    });
  }
  await writeFrequency(GALLERY_KEY, counts);
}

export async function recordUserTagUsage(tags: string[]) {
  if (!tags.length) {
    return;
  }
  const freq = await readFrequency(USER_KEY);
  tags.forEach((tag) => {
    const normalized = tag.toLowerCase();
    freq[normalized] = (freq[normalized] ?? 0) + 1;
  });
  await writeFrequency(USER_KEY, freq);
}

export async function getTopTags(limit = 10): Promise<string[]> {
  const gallery = await readFrequency(GALLERY_KEY);
  const user = await readFrequency(USER_KEY);
  const combined: FrequencyMap = {};

  for (const [tag, count] of Object.entries(gallery)) {
    combined[tag] = (combined[tag] ?? 0) + count;
  }
  for (const [tag, count] of Object.entries(user)) {
    combined[tag] = (combined[tag] ?? 0) + count;
  }

  return Object.entries(combined)
    .sort((a, b) => {
      if (b[1] === a[1]) {
        return a[0].localeCompare(b[0]);
      }
      return b[1] - a[1];
    })
    .slice(0, limit)
    .map(([tag]) => tag);
}
