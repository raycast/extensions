import { getPreferenceValues } from "@raycast/api";

import { clampWordsPerPage } from "./domain/pagination";
import { isMoodId, type MoodId } from "./theme/hue-tokens";

export const DEFAULT_COMMUNITY_INDEX_URL = "https://cdn.jsdelivr.net/gh/crafts69guy/ebook-hub-library@main/index.json";

export interface EbookHubPreferences {
  mood: MoodId;
  wordsPerPage: number;
  focusMode: boolean;
  communityIndexUrl: string;
}

export function readPreferences(): EbookHubPreferences {
  const raw = getPreferenceValues<Preferences>();
  const communityIndexUrl = raw.communityIndexUrl?.trim();
  return {
    mood: raw.theme && isMoodId(raw.theme) ? raw.theme : "mua",
    wordsPerPage: clampWordsPerPage(raw.wordsPerPage ?? ""),
    focusMode: raw.focusMode ?? false,
    communityIndexUrl: communityIndexUrl ? communityIndexUrl : DEFAULT_COMMUNITY_INDEX_URL,
  };
}
