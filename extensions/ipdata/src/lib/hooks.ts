import { useEffect, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { cachedLookup } from "./cache";
import { reservedLabel } from "./ip";
import { LookupError, LookupOk, Settings } from "./ipdata";
import { settingsKey } from "./settings";

export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export type LookupState =
  | { status: "loading" }
  | { status: "reserved"; label: string }
  | { status: "ok"; result: LookupOk }
  | { status: "error"; result: LookupError };

// Looks `ip` up (cached for an hour) and exposes the result as a view state. Reserved
// addresses are recognized locally and never sent anywhere.
export function useLookup(ip: string | null, settings: Settings) {
  const [nonce, setNonce] = useState(0);
  const reserved = ip ? reservedLabel(ip) : null;
  const { data, isLoading } = useCachedPromise(
    (tag: string, target: string, key: string, force: number) => {
      void tag;
      void key;
      return cachedLookup(target, settings, force > 0);
    },
    ["lookup", ip ?? "", settingsKey(settings), nonce],
    { execute: !!ip && !reserved, keepPreviousData: false },
  );
  let state: LookupState | null = null;
  if (ip) {
    if (reserved) state = { status: "reserved", label: reserved };
    else if (data) state = data.ok ? { status: "ok", result: data } : { status: "error", result: data };
    else state = { status: "loading" };
  }
  return { state, isLoading: !!ip && !reserved && isLoading, refresh: () => setNonce((n) => n + 1) };
}
