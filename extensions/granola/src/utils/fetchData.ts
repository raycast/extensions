import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import getAccessToken from "./getAccessToken";
import { GetDocumentsResponse } from "./types";

export function fetchGranolaData(route: string) {
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    getAccessToken()
      .then((token) => {
        if (mounted) setAccessToken(token);
      })
      .catch((err) => {
        if (mounted) setError(new Error(`Failed to get access token, ${err}`));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const url = `https://api.granola.ai/v2/${route}`;

  const { isLoading, data, revalidate } = useFetch<GetDocumentsResponse>(url, {
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
    execute: !!accessToken, // Prevent API calls when accessToken is undefined
  });

  if (error) {
    throw error;
  }

  return { isLoading: isLoading || !accessToken, data, revalidate };
}
