import { Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { listAllKnowledgeBases } from "../lib/api";
import { normalizeGetNoteError } from "../lib/errors";
import { KnowledgeBase } from "../lib/types";

export function useKnowledgeBases(enabled: boolean) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);

  async function reload() {
    if (!enabled) {
      setKnowledgeBases([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      setKnowledgeBases(await listAllKnowledgeBases());
    } catch (error) {
      setKnowledgeBases([]);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Knowledge Bases",
        message: normalizeGetNoteError(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [enabled]);

  return {
    knowledgeBases,
    isLoading,
    reload,
  };
}
