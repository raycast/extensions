import { useCallback, useEffect, useState } from "react";
import getObsidianTags from "../helpers/get-obsidian-tags";
import { getLocalStorageTags } from "../helpers/localstorage-tags";

export type TagsHook = { loading: boolean; tags: string[] };
export default function useTags(): TagsHook {
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const addTags = useCallback(
    (newTags: string[] | Set<string>) => {
      setTags((orig) => {
        const newSet = new Set([...orig, ...newTags]);
        return [...newSet];
      });
    },
    [setTags]
  );

  useEffect(() => {
    const obsidian = getObsidianTags().then((tags) => addTags(tags));
    const localStorage = getLocalStorageTags().then((tags) => addTags(tags));

    Promise.allSettled([obsidian, localStorage]).then(() => setLoading(false));
  }, [addTags, setLoading]);

  return { tags, loading };
}
