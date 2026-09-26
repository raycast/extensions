import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { api } from "../lib/api";

export function useAccounts(resolveBalances = false) {
  const abortable = useRef<AbortController | null>(null);
  return usePromise(
    (resolve: boolean) =>
      resolve ? api.accountsWithBalances(abortable.current?.signal) : api.accounts(abortable.current?.signal),
    [resolveBalances],
    { abortable, onError: () => {} },
  );
}

export function useConnections() {
  const abortable = useRef<AbortController | null>(null);
  return usePromise(() => api.connections(abortable.current?.signal), [], { abortable, onError: () => {} });
}
