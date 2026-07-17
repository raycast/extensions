import { useEffect, useState } from "react";
import { isEmbedRunning } from "../utils/qmd";

interface UseIndexingStateResult {
  isIndexing: boolean;
}

export function useIndexingState(): UseIndexingStateResult {
  const [isIndexing, setIsIndexing] = useState(false);

  useEffect(() => {
    // Check immediately
    setIsIndexing(isEmbedRunning());

    // Poll every second
    const interval = setInterval(() => {
      setIsIndexing(isEmbedRunning());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { isIndexing };
}
