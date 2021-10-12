import fetch from "node-fetch";
import { homedir } from "os";
import { resolve } from "path";
import { useEffect, useState } from "react";

export interface PackageSearchResult {
  package: {
    name: string;
    version: string;
    description: string;
    links: {
      npm: string;
    };
    publisher?: {
      username: string;
    };
  };
}

export interface PackageSearchResponse {
  results: PackageSearchResult[];
}

export function usePackageSearch(query: string | undefined): {
  response?: PackageSearchResponse;
  error?: string;
  isLoading: boolean;
} {
  const [response, setResponse] = useState<PackageSearchResponse>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (cancel) {
        return;
      }

      if (!query) {
        setIsLoading(false);
        setResponse(undefined);
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const url = `https://api.npms.io/v2/search?q=${query ?? ""}`;
        const response = await fetch(url);
        const json = await response.json();

        if (!cancel) {
          setResponse(json as PackageSearchResponse);
        }
      } catch (e) {
        if (!cancel) {
          setError(String(e));
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { response, error, isLoading };
}

export function downloadsDir(): string {
  return resolve(homedir(), "Downloads");
}
