import { useState, useEffect } from "react";

import { showFailureToast } from "../utils/toast";
import { Enhet } from "../types";
import { searchEntities } from "../brreg-api";

function isAllDigits(str: string): boolean {
  return /^\d+$/.test(str);
}

export function useSearch() {
  const [searchText, setSearchText] = useState("");
  const [entities, setEntities] = useState<Enhet[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const trimmed = searchText.trim();
  const isNumeric = isAllDigits(trimmed);

  useEffect(() => {
    if (!trimmed) {
      setEntities([]);
      return;
    }

    if (isNumeric && trimmed.length < 9) {
      setEntities([]);
      return;
    }

    async function fetchEntities() {
      setIsLoading(true);
      try {
        const results = await searchEntities(trimmed);
        setEntities(results);
      } catch (error) {
        showFailureToast("Failed to fetch legal entities", (error as { message?: string })?.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEntities();
  }, [searchText]);

  const clearSearch = () => {
    setSearchText("");
    setEntities([]);
  };

  return {
    // State
    searchText,
    entities,
    isLoading,

    // Actions
    setSearchText,
    clearSearch,

    // Computed values
    trimmed,
    isNumeric,
    hasResults: entities.length > 0,
  };
}
