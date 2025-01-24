import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import type Pocketbase from "pocketbase";
import type { BeszelSystem } from "../types/beszel";

function sortSystems(systems: BeszelSystem[]) {
  return systems.sort((a, b) => a.name.localeCompare(b.name));
}

export function useSystems(client: Pocketbase | undefined) {
  const [state, setState] = useCachedState<{
    isLoading: boolean;
    systems: BeszelSystem[] | undefined;
    error: string | undefined;
  }>("beszel-systems", { isLoading: true, systems: undefined, error: undefined });

  useEffect(() => {
    if (!client) return;

    const controller = new AbortController();

    async function subscribe() {
      if (!client) return;

      setState(({ ...rest }) => ({ ...rest, isLoading: true }));

      try {
        const systems = await client.collection("systems").getFullList<BeszelSystem>({
          signal: controller.signal,
        });

        setState({ isLoading: false, systems, error: undefined });

        await client.collection("systems").subscribe<BeszelSystem>(
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
                    systems: sortSystems(
                      systems.map((system) => (system.id === event.record.id ? event.record : system)),
                    ),
                  };
                case "create":
                  return { ...rest, systems: sortSystems([...systems, event.record]) };
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
      controller.abort();
    };
  }, [client, setState]);

  return state;
}
