import { useCallback, useState } from "react";
import { Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { UserCancelledError } from "../core/exec";
import { fetchListeners } from "../core/lsof";
import { HiddenListener, ListeningSocket, fetchListeningSockets, findHiddenListeners } from "../core/netstat";
import { fetchProcessTable } from "../core/ps";
import { Listener, ProcessDetails } from "../core/types";

export interface ListenersState {
  listeners: Listener[];
  processes: Map<number, ProcessDetails>;
  /** Ports that are listening but that lsof would not name for the current user. */
  hidden: HiddenListener[];
  isLoading: boolean;
  /** True once the list was reloaded through an authenticated shell. */
  isElevated: boolean;
  revalidate: () => void;
  reloadAsAdmin: () => void;
}

/**
 * Single source of truth for both commands: the listener list joined with a snapshot of the
 * process table, reloadable either as the current user or with administrator rights.
 */
export function useListeners(): ListenersState {
  const [elevated, setElevated] = useState(false);

  const { data, isLoading, revalidate } = usePromise(
    async (admin: boolean) => {
      const [listeners, processes, sockets] = await Promise.all([
        fetchListeners({ admin }),
        fetchProcessTable(),
        // The cross-check is a nicety; losing it must never cost us the list itself.
        fetchListeningSockets().catch(() => [] as ListeningSocket[]),
      ]);
      return { listeners, processes, hidden: findHiddenListeners(sockets, listeners) };
    },
    [elevated],
    {
      onError: async (error) => {
        if (error instanceof UserCancelledError) {
          setElevated(false);
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not read open ports",
          message: error.message,
        });
      },
    },
  );

  const reloadAsAdmin = useCallback(() => {
    if (elevated) revalidate();
    else setElevated(true);
  }, [elevated, revalidate]);

  return {
    listeners: data?.listeners ?? [],
    processes: data?.processes ?? new Map(),
    hidden: data?.hidden ?? [],
    isLoading,
    isElevated: elevated,
    revalidate,
    reloadAsAdmin,
  };
}
