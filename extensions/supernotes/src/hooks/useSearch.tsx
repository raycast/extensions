import React from "react";

import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import fetch, { AbortError } from "node-fetch";

import { SUPERNOTES_API_URL } from "utils/defines";
import { ICardCollection, SupernotesErrorPayload } from "utils/types";

const useSearch = (callback: (cards?: ICardCollection) => void) => {
  const { apiKey } = getPreferenceValues();

  const [search, setSearch] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);

  const fetchCards = async (searchTerm: string, abortController: AbortController) => {
    try {
      setLoading(true);
      const searchParams = {
        search: searchTerm,
        include_membership_statuses: [1, 2],
      };

      const res = await fetch(`${SUPERNOTES_API_URL}/cards/get/select`, {
        method: "POST",
        signal: abortController.signal,
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

  React.useEffect(() => {
    if (!search) {
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    fetchCards(search, abortController);

    return () => {
      abortController.abort();
    };
  }, [search]);

  return {
    loading,
    search,
    setSearch,
  };
};

export default useSearch;
