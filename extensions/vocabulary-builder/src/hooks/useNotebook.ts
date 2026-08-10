import { useState, useEffect } from "react";
import { NotebookEntry } from "../data/types";
import { getNotebook } from "../data/data";

export function useNotebook(languageId: string) {
  const [entries, setEntries] = useState<NotebookEntry[] | undefined>(undefined);

  useEffect(() => {
    setEntries(getNotebook(languageId));
  }, [languageId]);

  function refresh() {
    setEntries(getNotebook(languageId));
  }

  return { entries, refresh };
}
