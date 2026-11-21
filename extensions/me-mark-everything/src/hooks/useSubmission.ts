import { LocalStorage } from "@raycast/api";
import { useEffect, useReducer, useState } from "react";
import { SubmissionController } from "../helpers/submission";

const listeners = new Set<() => void>();
// All mounted forms in this command share one guard, including hidden stack views.
const controller = new SubmissionController(
  {
    getItem: (key) => LocalStorage.getItem<string>(key),
    setItem: (key, value) => LocalStorage.setItem(key, value),
    removeItem: (key) => LocalStorage.removeItem(key),
  },
  undefined,
  () => listeners.forEach((listener) => listener()),
);

export function useSubmission() {
  const [, render] = useReducer((n) => n + 1, 0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error>();
  useEffect(() => {
    let mounted = true;
    listeners.add(render);
    void controller.load().then(
      () => {
        if (mounted) setReady(true);
      },
      (cause) => {
        if (mounted) setError(cause instanceof Error ? cause : new Error(String(cause)));
      },
    );
    return () => {
      mounted = false;
      listeners.delete(render);
    };
  }, []);
  return { controller, ready, error, busy: controller.busy, pending: controller.record };
}
