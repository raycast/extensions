import React from "react";

import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import fetch, { AbortError } from "node-fetch";

import { SUPERNOTES_API_URL } from "utils/defines";
import { ICardCollection, SupernotesErrorPayload } from "utils/types";

const useSearch = (callback: (cards?: ICardCollection) => void) => {
  const { apiKey } = getPreferenceValues();

  const [loading, setLoading] = React.useState(true);
  const abortRef = React.useRef<AbortController | null>(null);

  try {
    if (!apiKey) throw new Error("No API key found");

    React.useEffect(() => {
      search("");
      return () => {
        abortRef.current?.abort();
      };
    }, []);

    const search = async (searchTerm: string) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      if (searchTerm === "") {
        setLoading(false);
        callback(undefined);
        return;
      }
      try {
        setLoading(true);
        const searchParams = {
          search: searchTerm,
          include_membership_statuses: [1, 2],
        };
        const res = await fetch(`${SUPERNOTES_API_URL}/cards/get/select`, {
          method: "POST",
          signal: abortRef.current?.signal,
          body: JSON.stringify(searchParams),
          headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
        });
        const jsonData = await res.json();
        setLoading(false);
        if (res.status !== 200) {
          throw new Error((jsonData as SupernotesErrorPayload).detail);
        }
        callback(jsonData as ICardCollection);
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        showToast(Toast.Style.Failure, "Failed to perform search", String(error));
      }
    };
    return {
      loading,
      search,
    };
  } catch (error) {
    showToast(Toast.Style.Failure, "Uh oh! An unknown error occurred", String(error));
    return {
      search: () => ({}),
      loading: false,
    };
  }
};

export default useSearch;
