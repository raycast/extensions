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

const cached = cache.get("recent-selected-tags");
export const recentSelectedTagsAtom = atomWithStorage<SelectedTag[]>(
  "recent-selected-tags",
  cached ? (JSON.parse(cached) as SelectedTag[]) : [],
  tagsStorage,
);
