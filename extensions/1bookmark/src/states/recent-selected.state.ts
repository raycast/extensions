import { JotaiCacheStorage, cache } from "@/utils/jotai-cache-storage.util";
import { atomWithStorage } from "jotai/utils";

const stringStorage = new JotaiCacheStorage<string>();

export const recentSelectedSpaceAtom = atomWithStorage<string>(
  "recent-selected-space",
  cache.get("recent-selected-space") || "",
  stringStorage,
);

interface SelectedTag {
  name: string;
  spaceId: string;
}

const tagsStorage = new JotaiCacheStorage<SelectedTag[]>();

export const recentSelectedTagsAtom = atomWithStorage<SelectedTag[]>(
  "recent-selected-tags",
  cache.get("recent-selected-tags") ? (JSON.parse(cache.get("recent-selected-tags")!) as SelectedTag[]) : [],
  tagsStorage,
);
