import { getHAAreas } from "@components/area/utils";
import { getHADevices } from "@components/device/utils";
import { State } from "@lib/haapi";
import { useCachedState } from "@raycast/utils";
import { Connection, entitiesColl, subscribeEntities } from "home-assistant-js-websocket";
import { useEffect, useRef, useState } from "react";
import { getHAWSConnection } from "../lib/common";

interface EntityRegistryEntry {
  area_id?: string | null;
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

async function getEntityRegistryEntries(con: Connection): Promise<EntityRegistryEntry[]> {
  console.log("fetch entity registry");
  const entries: EntityRegistryEntry[] | null | undefined = await con.sendMessagePromise({
    type: "config/entity_registry/list",
  });
  return entries ?? [];
}

async function buildEntityAreaMap(entries: EntityRegistryEntry[]): Promise<Map<string, string>> {
  const [devices, areas] = await Promise.all([getHADevices(), getHAAreas()]);

  const areaNameById = new Map<string, string>();
  for (const area of areas ?? []) {
    if (area.name) {
      areaNameById.set(area.area_id, area.name);
    }
  }

  const deviceAreaById = new Map<string, string>();
  for (const device of devices ?? []) {
    if (device.area_id) {
      deviceAreaById.set(device.id, device.area_id);
    }
  }

  const entityAreaMap = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.entity_id) continue;
    const areaId = entry.area_id ?? (entry.device_id ? deviceAreaById.get(entry.device_id) : undefined);
    if (areaId) {
      const areaName = areaNameById.get(areaId);
      if (areaName) {
        entityAreaMap.set(entry.entity_id, areaName);
      }
    }
  }

  return entityAreaMap;
}

export function useHAStates(): {
  states?: State[];
  error?: Error;
  isLoading: boolean;
} {
  const [states, setStates] = useCachedState<State[]>("states");
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const hawsRef = useRef<Connection | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(undefined);

      try {
        if (!hawsRef.current) {
          const con = await getHAWSConnection();

          const entries = await getEntityRegistryEntries(con);
          const entityRegistry = new EntityRegistry(entries);
          const entityAreaMap = await buildEntityAreaMap(entries);

          subscribeEntities(con, (entities) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const haStates = Object.entries(entities).map(([k, v]) => v as State);
            if (haStates.length > 0) {
              // Home Assistant often send empty states array in the beginning of an connection. This cause empty state flickering in raycast.
              const filteredStates = haStates.filter((s) => entityRegistry.isUserVisible(s.entity_id));
              for (const state of filteredStates) {
                state.area_name = entityAreaMap.get(state.entity_id);
              }
              setStates(filteredStates);
              setIsLoading(false);
            } else {
              console.log("ignore empty states callback");
            }
          });
          hawsRef.current = con;
        } else {
          const entColl = entitiesColl(hawsRef.current);
          await entColl.refresh();
        }
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(e);
        setError(err);
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return { states, error, isLoading };
}
