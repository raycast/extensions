import { useEffect, useState } from "react";
import { createLookupClient, MeaningGroup } from "./lookup";

const client = createLookupClient();

type Result = {
  query: string;
  revision: number;
} & ({ groups: MeaningGroup[]; error?: never } | { groups?: never; error: string });

export function useLookup(query: string) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result>();

  useEffect(() => {
    setResult(undefined);
    if (!query) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      client.lookup(query, controller.signal).then(
        (groups) => {
          if (active) setResult({ query, revision, groups });
        },
        (error: unknown) => {
          if (active) {
            setResult({
              query,
              revision,
              error: error instanceof Error ? error.message : "Could not complete the lookup. Please retry.",
            });
          }
        },
      );
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, revision]);

  // Hide previous-query actions immediately, including during the debounce.
  const current = result?.query === query && result.revision === revision ? result : undefined;
  return {
    groups: query ? current?.groups : undefined,
    error: query ? current?.error : undefined,
    isLoading: Boolean(query && !current),
    retry() {
      client.invalidate(query);
      setRevision((value) => value + 1);
    },
  };
}
