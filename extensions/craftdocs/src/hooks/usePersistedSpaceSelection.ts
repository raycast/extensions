import { Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import { resolvePersistedSpaceSelection } from "../lib/spaceSelection";

const cache = new Cache();

type UsePersistedSpaceSelectionParams = {
  cacheKey: string;
  validSelections: string[];
  fallbackSelection: string;
  alwaysAllowedSelections?: string[];
};

export default function usePersistedSpaceSelection({
  cacheKey,
  validSelections,
  fallbackSelection,
  alwaysAllowedSelections = [],
}: UsePersistedSpaceSelectionParams) {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(cache.get(cacheKey) || "");
  const resolvedSelectedSpaceId = resolvePersistedSpaceSelection({
    currentSelection: selectedSpaceId,
    validSelections,
    fallbackSelection,
    alwaysAllowedSelections,
  });

  useEffect(() => {
    if (resolvedSelectedSpaceId === selectedSpaceId) {
      return;
    }

    cache.set(cacheKey, resolvedSelectedSpaceId);
    setSelectedSpaceId(resolvedSelectedSpaceId);
  }, [cacheKey, resolvedSelectedSpaceId, selectedSpaceId]);

  const updateSelectedSpaceId = (nextSelection: string) => {
    cache.set(cacheKey, nextSelection);
    setSelectedSpaceId(nextSelection);
  };

  return {
    selectedSpaceId: resolvedSelectedSpaceId,
    setSelectedSpaceId: updateSelectedSpaceId,
  };
}
