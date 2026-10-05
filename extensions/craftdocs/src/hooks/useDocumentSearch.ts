import { useDeferredValue, useEffect, useState } from "react";
import { UseDB } from "./useDB";
import { DocBlock, searchDocumentsAcrossDatabases } from "../lib/search";

type UseDocumentSearch = {
  resultsLoading: boolean;
  results: DocBlock[];
};

export default function useDocumentSearch({ databasesLoading, databases }: UseDB, text: string) {
  const [state, setState] = useState<UseDocumentSearch>({ resultsLoading: true, results: [] });
  const deferredText = useDeferredValue(text);

  useEffect(() => {
    if (databasesLoading) {
      return;
    }

    setState((previousState) => ({ ...previousState, resultsLoading: true }));

    const results = searchDocumentsAcrossDatabases(databases, deferredText);
    setState({ resultsLoading: false, results });
  }, [databases, databasesLoading, deferredText]);

  return state;
}

export type { DocBlock };
