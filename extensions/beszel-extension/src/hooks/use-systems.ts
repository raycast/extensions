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
  }>("beszel-systems", { isLoading: true, systems: undefined });

  useEffect(() => {
    const controller = new AbortController();

    let unsubscribe: (() => void) | undefined;
    async function subscribe() {
      setState(({ systems }) => ({ isLoading: true, systems }));

      const client = await getClient();

      try {
        const systems = await client.collection("systems").getFullList<BeszelSystem>({
          signal: controller.signal,
        });

        setState({ isLoading: false, systems });
      } catch {
        return;
      }

      unsubscribe = await client.collection("systems").subscribe<BeszelSystem>(
        "*",
        (event) => {
          setState(({ isLoading, systems }) => {
            if (!systems) return { isLoading, systems };

            switch (event.action) {
              case "delete":
                return { isLoading, systems: systems.filter((system) => system.id !== event.record.id) };
              case "update":
                return {
                  isLoading,
                  systems: systems.map((system) => (system.id === event.record.id ? event.record : system)),
                };
              case "create":
                return { isLoading, systems: [...systems, event.record] };
              default:
                return { isLoading, systems };
            }
          });
        },
        {
          signal: controller.signal,
        },
      );
    }

    subscribe();

    return () => {
      unsubscribe?.();
      controller.abort();
    };
  }, [setState]);

  return state;
}
