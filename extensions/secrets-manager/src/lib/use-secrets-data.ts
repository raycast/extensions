import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { getStore } from "./context";
import type { Secret, TagInfo } from "./types";

export type SecretsData = { secrets: Secret[]; tree: string[][]; tags: TagInfo[] };

export function useSecretsData() {
  const [data, setData] = useState<SecretsData>({ secrets: [], tree: [], tags: [] });
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const store = getStore();
      const [secrets, tree, tags] = await Promise.all([store.list(), store.folderTree(), store.listTags()]);
      setData({ secrets, tree, tags });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load", message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return { data, loading, reload };
}
