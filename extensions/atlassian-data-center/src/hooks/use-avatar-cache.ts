import { useCachedState } from "@raycast/utils";
import { useRef, useCallback, useEffect } from "react";
import { AVATAR_TYPE_CACHE_KEY_MAP } from "@/constants";
import type { AvatarType } from "@/types";

type AvatarCache = Record<string, string>;

const DEFAULT_AVATAR_CACHE: AvatarCache = {};
const THROTTLE_DELAY = 300;
const MAX_CACHE_SIZE = 300;

export function useAvatarCache(avatarType: AvatarType) {
  const cacheKey = AVATAR_TYPE_CACHE_KEY_MAP[avatarType];
  const [cache, setCache] = useCachedState<AvatarCache>(cacheKey, DEFAULT_AVATAR_CACHE);

  const pendingBatchRef = useRef<AvatarCache>({});
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flushBatch = useCallback(() => {
    const itemsToUpdate = { ...pendingBatchRef.current };
    if (Object.keys(itemsToUpdate).length === 0) return;

    pendingBatchRef.current = {};

    setCache((prev) => {
      const updated = {
        ...prev,
        ...itemsToUpdate,
      };

      const keys = Object.keys(updated);
      if (keys.length > MAX_CACHE_SIZE) {
        const keysToKeep = keys.slice(-MAX_CACHE_SIZE);
        const limited: AvatarCache = {};
        keysToKeep.forEach((key) => {
          limited[key] = updated[key];
        });
        return limited;
      }

      return updated;
    });
  }, [setCache]);

  const scheduleUpdate = useCallback(() => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
    }

    throttleTimerRef.current = setTimeout(() => {
      throttleTimerRef.current = null;
      flushBatch();
    }, THROTTLE_DELAY);
  }, [flushBatch]);

  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      if (Object.keys(pendingBatchRef.current).length > 0) {
        flushBatch();
      }
    };
  }, [flushBatch]);

  const get = (key: string): string | undefined => {
    return cache[key];
  };

  const has = (key: string): boolean => {
    return key in cache;
  };

  const set = useCallback(
    (key: string, value: string) => {
      pendingBatchRef.current[key] = value;
      scheduleUpdate();
    },
    [scheduleUpdate],
  );

  const setBatch = useCallback(
    (items: Array<{ key: string; value: string }>) => {
      items.forEach((item) => {
        pendingBatchRef.current[item.key] = item.value;
      });
      scheduleUpdate();
    },
    [scheduleUpdate],
  );

  const remove = (key: string) => {
    setCache((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const clear = () => {
    setCache(DEFAULT_AVATAR_CACHE);
  };

  return {
    cache,
    get,
    has,
    set,
    setBatch,
    remove,
    clear,
  };
}
