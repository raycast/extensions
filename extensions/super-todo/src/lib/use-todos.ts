import { useCallback, useEffect, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { request } from "./bridge";
import { CompanionNotFoundError } from "./companion";
import { Mutation, Snapshot } from "./protocol";

export function useTodos() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ todos: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [needsCompanion, setNeedsCompanion] = useState(false);
  const mounted = useRef(false);
  const writing = useRef(false);
  const reading = useRef(false);
  const revision = useRef(0);

  const refresh = useCallback(async () => {
    if (writing.current || reading.current) return;
    reading.current = true;
    const current = revision.current;
    try {
      const result = await request(["list"]);
      if (mounted.current && current === revision.current) {
        setSnapshot(result);
        setNeedsCompanion(false);
        setError(undefined);
      }
    } catch (failure) {
      if (mounted.current && current === revision.current) {
        setNeedsCompanion(failure instanceof CompanionNotFoundError);
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load your todos.",
        );
      }
    } finally {
      reading.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  const mutate = useCallback(async (operation: Mutation): Promise<boolean> => {
    if (writing.current) return false;
    writing.current = true;
    revision.current += 1;
    setBusy(true);
    try {
      const result = await request(operation);
      if (mounted.current) {
        setSnapshot(result);
        setNeedsCompanion(false);
        setError(undefined);
      }
      return true;
    } catch (failure) {
      const message =
        failure instanceof Error
          ? failure.message
          : "Could not save the change.";
      if (mounted.current) {
        setNeedsCompanion(failure instanceof CompanionNotFoundError);
        setError(message);
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Confirm the Change",
        message,
      });
      return false;
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => void refresh(), 1500);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refresh]);

  return { ...snapshot, loading, busy, error, needsCompanion, refresh, mutate };
}
