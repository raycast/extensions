import { Connection, entitiesColl, subscribeEntities } from "home-assistant-js-websocket";
import { useEffect, useRef, useState } from "react";
import { getHAWSConnection } from "./common";
import { State } from "./haapi";

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
  console.log("fetch entity registry");
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
  const [states, setStates] = useState<State[]>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const hawsRef = useRef<Connection>();

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        if (!hawsRef.current) {
          const con = await getHAWSConnection();

          const entityRegistry = await getEntityRegistry(con);

          subscribeEntities(con, (entities) => {
            console.log("incoming entities changes");
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const haStates = Object.entries(entities).map(([k, v]) => v as State);
            if (!didUnmount) {
              console.log("set new entities");
              if (haStates.length > 0) {
                // Home Assistant often send empty states array in the beginning of an connection. This cause empty state flickering in raycast.
                const filteredStates = haStates.filter((s) => entityRegistry.isUserVisible(s.entity_id));
                setStates(filteredStates);
                setIsLoading(false);
              } else {
                console.log("ignore empty states callback");
              }
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
    };
  }, []);

  return { states, error, isLoading };
}
