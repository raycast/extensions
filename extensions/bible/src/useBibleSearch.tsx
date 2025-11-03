import * as React from "react";
import { search } from "./bibleGatewayApi";
import { ReferenceSearchResult } from "./types";

export function useBibleSearch(query: { search?: string; version?: string }) {
  const [data, setData] = React.useState<ReferenceSearchResult | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!query.search || !query.version) {
      setData(undefined);
      setIsLoading(false);
      setError(null);
      return;
    }

    let ignore = false;
    setIsLoading(true);
    search(query.search, query.version)
      .then((result) => {
        if (!ignore) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setData(undefined);
          setError(err);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [query.search, query.version]);
  return { data, error, isLoading };
}
