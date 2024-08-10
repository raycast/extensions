import { useState, useEffect } from "react";
import { ensureStorageObjectsExist, STORAGE_OBJECTS } from "../storage";

export function useEnsureFiles(objects: STORAGE_OBJECTS[]) {
  const [objectsExists, setObjectsExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAndCreateFiles = () => {
      try {
        const exist = ensureStorageObjectsExist(objects);
        if (isMounted) {
          setObjectsExists(exist);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isMounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    checkAndCreateFiles();

    return () => {
      isMounted = false;
    };
  }, [objects]);

  return { objectsExists, error, isLoading };
}
