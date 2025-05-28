import { useState, useEffect, useRef, useCallback } from "react";
import { log } from "../utils";

interface UseSearchDebounceProps {
  initialText?: string;
  debounceTime?: number;
  onDebounced?: (text: string) => void;
}

/**
 * Hook for debouncing search text input
 */
export function useSearchDebounce({ initialText = "", debounceTime = 800, onDebounced }: UseSearchDebounceProps = {}) {
  const [searchText, setSearchText] = useState<string>(initialText);
  const [debouncedText, setDebouncedText] = useState<string>(initialText);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchTextRef = useRef<string>(searchText);
  const lastProcessedText = useRef<string>("");
  const setSearchTextRef = useRef<(text: string) => void>((text: string) => setSearchText(text));

  // Update ref when searchText changes
  useEffect(() => {
    searchTextRef.current = searchText;
  }, [searchText]);

  // Debounce the search text
  useEffect(() => {
    log("debug", "useSearchDebounce", "Search text changed", { searchText });

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      // Only proceed if the text hasn't changed during the delay
      if (searchTextRef.current === searchText) {
        if (searchText !== lastProcessedText.current) {
          log("debug", "useSearchDebounce", "Debounced search text update", {
            from: lastProcessedText.current,
            to: searchText,
          });

          setDebouncedText(searchText);
          lastProcessedText.current = searchText;

          if (onDebounced) {
            onDebounced(searchText);
          }
        }
      }
    }, debounceTime);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchText, debounceTime, onDebounced]);

  // Handler to update search text with stable reference
  const updateSearchText = useCallback((text: string) => {
    setSearchTextRef.current(text);
  }, []); // Empty dependency array ensures stable function reference

  return {
    searchText,
    debouncedText,
    setSearchText: updateSearchText,
  };
}
