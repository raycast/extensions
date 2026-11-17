import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { InstaBoxError } from "../services/instabox";
import { getMachine, listMachines } from "../services/machines";
import { Machine } from "../types";
import { errorToast, showError } from "../utils/errors";
import { isBusy } from "../utils/machine-state";
import { useAccountData } from "./use-account-data";

const POLL_INTERVAL_MS = 3000;

/** Refreshes while `active` is true, so machines in the middle of an operation update on their own. */
export function usePolling(active: boolean, revalidate: () => void) {
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(revalidate, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active, revalidate]);
}

export function useMachines() {
  const result = useAccountData("machines", listMachines, { onError: errorToast("Could not load machines") });
  usePolling(!!result.data?.some(isBusy), result.revalidate);
  return result;
}

/**
 * Follows one machine, starting from `initial` (fresh from the list) rather than a cached copy.
 * A deleted machine answers 404: it then shows as deleted and polling stops.
 */
export function useMachine(initial: Machine) {
  const [deleted, setDeleted] = useState(false);
  const result = usePromise(getMachine, [initial.id], {
    onError(error) {
      if (error instanceof InstaBoxError && error.status === 404) setDeleted(true);
      else showError(error, { title: "Could not load the machine" });
    },
  });
  const latest = result.data ?? initial;
  const machine: Machine = deleted ? { ...latest, state: "deleted", operationId: null } : latest;
  usePolling(isBusy(machine), result.revalidate);
  return { ...result, data: machine };
}
