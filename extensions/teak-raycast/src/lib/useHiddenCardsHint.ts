import { useEffect, useState } from "react";
import { hasHiddenCards } from "./api";

export const useHiddenCardsHint = (shouldCheck: boolean): boolean => {
  const [hasHidden, setHasHidden] = useState(false);

  useEffect(() => {
    if (!shouldCheck) {
      setHasHidden(false);
      return;
    }
    let cancelled = false;
    hasHiddenCards("silent")
      .then((found) => {
        if (!cancelled) {
          setHasHidden(found);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasHidden(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shouldCheck]);

  return hasHidden;
};
