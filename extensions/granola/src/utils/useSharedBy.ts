import { useState, useEffect, useRef } from "react";
import { getDocumentCreator } from "./fetchData";

/**
 * Hook to lazily fetch the creator name for a shared document.
 * Only fetches when the document is marked as shared.
 */
export function useSharedBy(
  documentId: string | null | undefined,
  isShared: boolean | undefined,
): {
  sharedBy: string | null;
  isLoading: boolean;
} {
  const [sharedBy, setSharedBy] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!documentId || !isShared) {
      setSharedBy(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    getDocumentCreator(documentId)
      .then((creator) => {
        if (requestIdRef.current !== requestId) return;
        setSharedBy(creator);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setSharedBy(null);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [documentId, isShared]);

  return { sharedBy, isLoading };
}
