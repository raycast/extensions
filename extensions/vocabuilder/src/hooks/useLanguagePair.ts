import { useCallback, useEffect, useState } from "react";
import { getLanguagePair, LanguagePair, storageKeyPrefix } from "../lib/languages";
import { getActiveLanguagePair, parseLanguagePairValue, setActiveLanguagePairValue } from "../lib/languageSession";

type Result = {
  selectPairValue: (value: string) => Promise<LanguagePair | null>;
} & (
  | {
      pair: LanguagePair;
      defaultPair: LanguagePair;
      isLoading: boolean;
      error: null;
    }
  | {
      pair: null;
      defaultPair: null;
      isLoading: false;
      error: string;
    }
);

export function useLanguagePair(initialPair?: LanguagePair): Result {
  const [preferenceResult] = useState(() => {
    try {
      return { pair: getLanguagePair(), error: null };
    } catch (e) {
      return { pair: null, error: e instanceof Error ? e.message : "Invalid language configuration." };
    }
  });

  const fallbackPair = initialPair ?? preferenceResult.pair;
  const [pair, setPair] = useState<LanguagePair | null>(fallbackPair);
  const [isLoading, setIsLoading] = useState(!initialPair && !!preferenceResult.pair);

  const preferencePairKey = preferenceResult.pair ? storageKeyPrefix(preferenceResult.pair) : null;
  const initialPairKey = initialPair ? storageKeyPrefix(initialPair) : null;

  useEffect(() => {
    const preferencePair = preferencePairKey ? parseLanguagePairValue(preferencePairKey) : null;
    if (!preferencePair) return;

    let stale = false;
    const explicitPair = initialPairKey ? parseLanguagePairValue(initialPairKey) : null;
    const fallback = explicitPair ?? preferencePair;
    setPair(fallback);

    if (explicitPair && initialPairKey) {
      setIsLoading(false);
      setActiveLanguagePairValue(initialPairKey).catch(() => {
        /* ignore persistence failure; the view can still use the explicit pair */
      });
      return () => {
        stale = true;
      };
    }

    async function loadActivePair() {
      try {
        const activePair = await getActiveLanguagePair(fallback);
        if (!stale) setPair(activePair);
      } finally {
        if (!stale) setIsLoading(false);
      }
    }

    setIsLoading(true);
    void loadActivePair();

    return () => {
      stale = true;
    };
  }, [initialPairKey, preferencePairKey]);

  const selectPairValue = useCallback(async (value: string): Promise<LanguagePair | null> => {
    const selected = await setActiveLanguagePairValue(value);
    if (selected) setPair(selected);
    return selected;
  }, []);

  if (!preferenceResult.pair || !pair) {
    return {
      pair: null,
      defaultPair: null,
      isLoading: false,
      error: preferenceResult.error ?? "Invalid language configuration.",
      selectPairValue,
    };
  }

  return {
    pair,
    defaultPair: preferenceResult.pair,
    isLoading,
    error: null,
    selectPairValue,
  };
}
