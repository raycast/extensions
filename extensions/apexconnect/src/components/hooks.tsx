import { State } from "@lib/apexapi";
import { useCachedState } from "@raycast/utils";
import { Connection, entitiesColl, subscribeEntities } from "@apexinfosysindia/js-websocket";
import { useEffect, useRef, useState } from "react";
import { getApexWSConnection } from "../lib/common";

interface EntityRegistryEntry {
  device_id?: string | null;
  disabled_by?: string | null;
  entity_category?: string | null;
  entity_id?: string | null;
  hidden_by?: string | null;
}

class EntityRegistry {
  constructor(private readonly entries: EntityRegistryEntry[] | null | undefined) {}

  isUserVisible(entity_id: string): boolean {
    if (!entity_id || entity_id.length <= 0) {
      return true;
    }
    const entry = this.entries?.find((e) => e.entity_id !== null && e.entity_id === entity_id);
    if (entry) {
      const hidden = !!entry.hidden_by;
      const disabled = !!entry.disabled_by;
      return !(hidden || disabled);
    }
    return true;
  }
}

async function getEntityRegistry(con: Connection): Promise<EntityRegistry> {
  const entries: EntityRegistryEntry[] | null | undefined = await con.sendMessagePromise({
    type: "config/entity_registry/list",
  });
  return new EntityRegistry(entries);
}

export function useHAStates(): {
  states?: State[];
  error?: Error;
  isLoading: boolean;
} {
  const [states, setStates] = useCachedState<State[]>("states");
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const hawsRef = useRef<Connection>();

  useEffect(() => {
    let didUnmount = false;
    let unsubscribe: ReturnType<typeof subscribeEntities> | undefined;

    async function fetchData() {
      setIsLoading(true);
      setError(undefined);

      try {
        if (!hawsRef.current) {
          const con = await getApexWSConnection();
          if (didUnmount) {
            return;
          }

          const entityRegistry = await getEntityRegistry(con);
          if (didUnmount) {
            return;
          }

          // Reopening this view must not leave the previous callback attached
          // to the shared connection - it would keep firing on a component
          // that's gone, piling up with every reopen.
          unsubscribe = subscribeEntities(con, (entities) => {
            if (didUnmount) {
              return;
            }
            const haStates = Object.values(entities) as State[];
            if (haStates.length > 0) {
              // Apex Connect often send empty states array in the beginning of an connection. This cause empty state flickering in raycast.
              const filteredStates = haStates.filter((s) => entityRegistry.isUserVisible(s.entity_id));
              setStates(filteredStates);
              setIsLoading(false);
            }
          });
          hawsRef.current = con;
        } else {
          const entColl = entitiesColl(hawsRef.current);
          await entColl.refresh();
        }
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (!didUnmount) {
          const err = e instanceof Error ? e : new Error(e);
          setError(err);
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
      unsubscribe?.();
    };
  }, []);

  return { states, error, isLoading };
}
