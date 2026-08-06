import { useCallback, useEffect } from "react";
import { flushPendingAlerts } from "../lib/alerts";

/** Drain any background alerts when a command view opens. */
export function useAlerts() {
  const showAlerts = useCallback(async () => {
    await flushPendingAlerts();
  }, []);

  useEffect(() => {
    showAlerts();
  }, [showAlerts]);

  return { showAlerts };
}
