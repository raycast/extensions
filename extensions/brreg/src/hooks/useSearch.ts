import { useState, useEffect, useRef } from "react";

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
  const requestIdRef = useRef(0);

  const trimmed = searchText.trim();

  useEffect(() => {
    const isNumericQuery = isAllDigits(trimmed);
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    let cancelled = false;

    if (!trimmed) {
      setEntities([]);
      setIsLoading(false);
      return;
    }

    if (isNumericQuery && trimmed.length < 9) {
      setEntities([]);
      setIsLoading(false);
      return;
    }

    async function fetchEntities() {
      setIsLoading(true);
      try {
        const results = await searchEntities(trimmed);
        if (!cancelled && requestId === requestIdRef.current) {
          setEntities(results);
        }
      } catch (error) {
        if (!cancelled && requestId === requestIdRef.current) {
          showFailureToast("Failed to fetch legal entities", (error as { message?: string })?.message);
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    const debounceTimer = setTimeout(fetchEntities, 300);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [trimmed]);

  return {
    // State
    searchText,
    entities,
    isLoading,

    // Actions
    setSearchText,

    // Computed values
    trimmed,
    hasResults: entities.length > 0,
  };
}
