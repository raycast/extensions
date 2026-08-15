import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import type Pocketbase from "pocketbase";
import type { BeszelSystem } from "../types/beszel";
import { openExtensionPreferences } from "@raycast/api";

function sortSystems(systems: BeszelSystem[]) {
  return systems.sort((a, b) => a.name.localeCompare(b.name));
}

export function useSystems(client: Pocketbase | undefined) {
  const {
    data: systems,
    isLoading,
    mutate,
  } = useCachedPromise(
    async () => {
      if (!client) return [];

      return sortSystems(await client.collection("systems").getFullList<BeszelSystem>());
    },
    [],
    {
      execute: client !== undefined,
      keepPreviousData: true,
      failureToastOptions: {
        title: "Configuration Error",
        message: "Please check your configuration and try again.",
        primaryAction: {
          title: "Open Extension Preferences",
          onAction: () => {
            openExtensionPreferences();
          },
        },
      },
    },
  );

  useEffect(() => {
    if (!client) return;

    const controller = new AbortController();

    async function subscribe() {
      if (!client) return;

      await client.collection("systems").subscribe<BeszelSystem>(
        "*",
        (event) => {
          mutate(undefined, {
            shouldRevalidateAfter: false,
            optimisticUpdate: (systems) => {
              if (!systems) return systems;

              switch (event.action) {
                case "delete":
                  return systems.filter((system) => system.id !== event.record.id);
                case "update":
                  return sortSystems(systems.map((system) => (system.id === event.record.id ? event.record : system)));
                case "create":
                  return sortSystems([...systems, event.record]);
                default:
                  return systems;
              }
            },
          });
        },
        {
          signal: controller.signal,
        },
      );
    }

    subscribe();

    return () => {
      controller.abort();
    };
  }, [client, mutate]);

  return { systems, isLoading };
}
