import { useState, useEffect, useRef } from "react";
import { getTranscriptSegments, formatDurationVerbose, calculateDurationFromSegments } from "./fetchData";

export function useTranscriptDuration(documentId: string | null | undefined): {
  duration: string | null;
  isLoading: boolean;
} {
  const [duration, setDuration] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!documentId) {
      setDuration(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    getTranscriptSegments(documentId)
      .then((segments) => {
        if (requestIdRef.current !== requestId) return;

        const durationMs = calculateDurationFromSegments(segments);
        if (durationMs !== null && durationMs > 0) {
          setDuration(formatDurationVerbose(durationMs));
        } else {
          setDuration(null);
        }
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setDuration(null);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [documentId]);

  return { duration, isLoading };
}
