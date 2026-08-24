import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { GlossaryError, loadGlossary } from "../glossary";
import { searchTerms, type SearchResult } from "../search";
import { glossaryReducer, type CommandState } from "./glossary-reducer";

export type { CommandState } from "./glossary-reducer";

type GlossaryController = Readonly<{
  query: string;
  reload: () => Promise<void>;
  result: SearchResult;
  setQuery: (query: string) => void;
  state: CommandState;
}>;

const EMPTY_SEARCH_RESULT: SearchResult = Object.freeze({
  terms: Object.freeze([]),
  totalMatchCount: 0,
});

const getSafeErrorMessage = (error: unknown): string => {
  return error instanceof GlossaryError ? error.message : "The glossary could not be loaded. Try reloading it.";
};

export const useGlossary = (): GlossaryController => {
  const { glossaryFile } = getPreferenceValues<Preferences.SearchTerm>();
  const [model, dispatch] = useReducer(glossaryReducer, { query: "", state: { status: "loading" } });
  const loadSequence = useRef(0);
  const reload = useCallback(async () => {
    const sequence = ++loadSequence.current;
    await Promise.resolve();
    if (sequence !== loadSequence.current) {
      return;
    }
    dispatch({ type: "loadStarted" });

    try {
      const terms = await loadGlossary(glossaryFile);
      if (sequence === loadSequence.current) {
        dispatch({ terms, type: "loadSucceeded" });
      }
    } catch (error: unknown) {
      if (sequence === loadSequence.current) {
        dispatch({ message: getSafeErrorMessage(error), type: "loadFailed" });
      }
    }
  }, [glossaryFile]);
  const setQuery = useCallback((query: string) => dispatch({ query, type: "queryChanged" }), []);
  const result = useMemo(
    () => (model.state.status === "ready" ? searchTerms(model.state.terms, model.query) : EMPTY_SEARCH_RESULT),
    [model.query, model.state],
  );

  useEffect(() => {
    let isActive = true;
    queueMicrotask(() => {
      if (isActive) {
        reload().catch(() => null);
      }
    });
    return (): void => {
      isActive = false;
      loadSequence.current += 1;
    };
  }, [reload]);

  return { query: model.query, reload, result, setQuery, state: model.state };
};
