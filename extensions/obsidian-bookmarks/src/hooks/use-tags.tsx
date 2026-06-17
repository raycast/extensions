import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { getLocalStorageFiles } from "../helpers/localstorage-files";
import getObsidianTags, { getTags } from "../helpers/get-obsidian-tags";
import tagify from "../helpers/tagify";
import { Preferences } from "../types";
import { getLocalStorageTags, replaceLocalStorageTags } from "../helpers/localstorage-tags";

export type TagsHook = {
  tags: string[];
  loading: boolean;
  backgroundLoading: boolean;
};

function uniqueTags(tags: string[]): string[] {
  return Array.from(new Set(tags));
}

export default function useTags(): TagsHook {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(true);

  useEffect(() => {
    async function loadTags() {
      try {
        // Quick initial load from localStorage tags
        const localTags = getTags(await getLocalStorageTags());
        const extraTags = tagify(getPreferenceValues<Preferences>().extraTags);
        setTags(uniqueTags([...localTags, ...extraTags]));
        setLoading(false);

        // Full load using cached files to get fresh tags from Obsidian
        const localFiles = await getLocalStorageFiles();
        const obsidianTags = await getObsidianTags(localFiles);
        setTags(uniqueTags([...obsidianTags, ...extraTags]));
        replaceLocalStorageTags(obsidianTags);
      } catch (error) {
        console.error("Error loading tags:", error);
      } finally {
        setLoading(false);
        setBackgroundLoading(false);
      }
    }

    loadTags();
  }, []);

  return {
    tags,
    loading,
    backgroundLoading,
  };
}
