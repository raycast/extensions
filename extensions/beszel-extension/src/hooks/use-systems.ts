import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

import { getClient } from "../helpers/get-client";

interface SystemInfo {
  /**
   * Network
   */
  b: number;

  /**
   * CPU Cores
   */
  c: number;

  /**
   * CPU
   */
  cpu: number;

  /**
   * Disk
   */
  dp: number;

  /**
   * Hostname
   */
  h: string;

  /**
   * Kernel
   */
  k: string;

  /**
   * CPU Chip
   */
  m: string;

  /**
   * Memory
   */
  mp: number;

  /**
   * Thread Count
   */
  t: number;

  /**
   * Uptime
   */
  u: number;

  /**
   * Agent Version
   */
  v: string;
}

export interface BeszelSystem {
  collectionId: string;
  collectionName: string;
  created: string;
  host: string;
  id: string;
  info: SystemInfo;
  name: string;
  port: string;
  status: "up" | "down" | "paused" | "pending";
  updated: string;
  users: string[];
}

export function useSystems() {
  const [state, setState] = useCachedState<{
    isLoading: boolean;
    systems: BeszelSystem[] | undefined;
    error: string | undefined;
  }>("beszel-systems", { isLoading: true, systems: undefined, error: undefined });

  useEffect(() => {
    const controller = new AbortController();

    let unsubscribe: (() => void) | undefined;
    async function subscribe() {
      setState(({ ...rest }) => ({ ...rest, isLoading: true }));

      try {
        const client = await getClient();

        const systems = await client.collection("systems").getFullList<BeszelSystem>({
          signal: controller.signal,
        });

        setState({ isLoading: false, systems, error: undefined });

        unsubscribe = await client.collection("systems").subscribe<BeszelSystem>(
          "*",
          (event) => {
            setState(({ systems, ...rest }) => {
              if (!systems) return { ...rest, systems };

              switch (event.action) {
                case "delete":
                  return { ...rest, systems: systems.filter((system) => system.id !== event.record.id) };
                case "update":
                  return {
                    ...rest,
                    systems: systems.map((system) => (system.id === event.record.id ? event.record : system)),
                  };
                case "create":
                  return { ...rest, systems: [...systems, event.record] };
                default:
                  return { ...rest, systems };
              }
            });
          },
          {
            signal: controller.signal,
          },
        );
      } catch (error) {
        if (error instanceof Error) {
          if ("isAbort" in error && error.isAbort) {
            return;
          }

          setState({ isLoading: false, systems: undefined, error: error.message });
        } else {
          setState({ isLoading: false, systems: undefined, error: "An unknown error occurred" });
        }
      }
    }

    subscribe();

    return () => {
      unsubscribe?.();
      controller.abort();
    };
  }, [setState]);

  return state;
}
