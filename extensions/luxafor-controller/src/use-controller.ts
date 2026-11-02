import { useCallback, useEffect, useRef, useState } from "react";
import { showFailureToast, usePromise } from "@raycast/utils";
import { Command, emptyState } from "./luxafor-state";
import { createService, refreshMenu, reportResult } from "./runtime";
import { Result } from "./luxafor-service";

export function useController() {
  const [service] = useState(createService);
  const [state, setState] = useState(emptyState);
  const [mutating, setMutating] = useState(false);
  const [notice, setNotice] = useState<string>();
  const alive = useRef(true);
  const pending = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const { isLoading, revalidate } = usePromise(
    async () => {
      const current = revision.current;
      try {
        return { current, state: await service.read() };
      } catch {
        // Return only safe context; storage errors can contain private paths/data.
        return { current, state: undefined };
      }
    },
    [],
    {
      onData(next) {
        if (!alive.current || next.current !== revision.current) return;
        if (next.state) {
          setState(next.state);
          setNotice(undefined);
        } else {
          setNotice("History unavailable. Reopen the command to try again.");
          void showFailureToast("Reopen the command to try again.", { title: "History Unavailable" });
        }
      },
    },
  );
  const refresh = useCallback(async () => {
    if (alive.current && !pending.current) await revalidate();
  }, [revalidate]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      ++revision.current;
      pending.current?.abort();
    };
  }, []);
  const send = async (command: Command): Promise<Result> => {
    if (!alive.current) return { ok: false, reason: "cancelled", uncertain: false };
    if (pending.current) return { ok: false, reason: "busy", uncertain: false };
    const controller = new AbortController();
    pending.current = controller;
    ++revision.current;
    setMutating(true);
    setNotice(undefined);
    setState((current) => ({ ...current, attempt: { command, startedAt: Date.now(), outcome: "pending" } }));
    try {
      const result = await service.send(command, controller.signal);
      if (!alive.current) return result;
      await revalidate();
      const refreshed = await refreshMenu();
      if (alive.current) {
        if (!refreshed) setNotice("Menu refresh unavailable. Enable Luxafor Menu Bar.");
        await reportResult(result);
      }
      return result;
    } finally {
      pending.current = null;
      if (alive.current) setMutating(false);
    }
  };
  const clearRecent = async (forgetLegacy = false) => {
    if (!alive.current || pending.current) return;
    pending.current = new AbortController();
    ++revision.current;
    setMutating(true);
    try {
      await service.clearRecent(forgetLegacy);
      if (!alive.current) return;
      await revalidate();
      await refreshMenu();
    } catch {
      if (alive.current)
        await showFailureToast("Wait for any active request to finish, then try again.", {
          title: "Could Not Clear Recent Colors",
        });
    } finally {
      pending.current = null;
      if (alive.current) setMutating(false);
    }
  };
  return { state, loading: isLoading || mutating, notice, refresh, send, clearRecent };
}
