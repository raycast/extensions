import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { hub } from "./hub";
import { Agent } from "./types";

/** Live agent list: refreshed every few seconds while the command is open. */
export function useAgents(includeEnded = false) {
  const state = useCachedPromise(
    (all: boolean) => hub<Agent[]>(all ? ["agents", "--all"] : ["agents"]),
    [includeEnded],
    { keepPreviousData: true, onError: () => undefined }, // the list shows an empty state instead of repeated toasts
  );
  useEffect(() => {
    const timer = setInterval(() => state.revalidate(), 3000);
    return () => clearInterval(timer);
  }, []);
  return state;
}
