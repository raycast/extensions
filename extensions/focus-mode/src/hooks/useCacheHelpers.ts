import { Cache } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { FocusOption } from "../utils";

const cacheKey = "focusOptions";

export function useCacheHelpers() {
  const cache = useMemo(() => new Cache(), []);

  const retriveData = useCallback((): FocusOption[] => {
    const getOptions = cache.get(cacheKey);

    return getOptions ? JSON.parse(getOptions) : [];
  }, [cache]);

  const storeData = useCallback((options: FocusOption[]) => cache.set(cacheKey, JSON.stringify(options)), [cache]);

  const handleUpdateActiveFocus = useCallback(
    (focusName: string, isActive: boolean) => {
      const updatedOptions = retriveData().map((focus) => ({
        ...focus,
        isActive: focus.name === focusName ? isActive : false,
      }));

      storeData(updatedOptions);

      return updatedOptions;
    },
    [retriveData, storeData]
  );

  return {
    handleUpdateActiveFocus,
    retriveData,
    storeData,
  };
}
