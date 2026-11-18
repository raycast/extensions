import { useDeferredValue, useEffect, useState } from "react";
import { UseDB } from "./useDB";
import { Block, searchBlocksAcrossDatabases } from "../lib/search";

export default function useSearch({ databasesLoading, databases }: UseDB, text: string) {
  const [state, setState] = useState({ resultsLoading: true, results: [] as Block[] });
  const deferredText = useDeferredValue(text);

  useEffect(() => {
    if (databasesLoading) {
      return;
    }

    setState((previousState) => ({ ...previousState, resultsLoading: true }));

    const results = searchBlocksAcrossDatabases(databases, deferredText);
    setState({ results, resultsLoading: false });
  }, [databases, databasesLoading, deferredText]);

  return state;
}
