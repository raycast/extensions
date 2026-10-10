import React, { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { DeepPartial, HueResource, Light, Room, Scene, Zone } from "../lib/types";
import { useMachine } from "@xstate/react";
import { hueBridgeMachine } from "../lib/hueBridgeMachine";
import { updateItems } from "../helpers/collections";
import { RESOURCES_CACHE_NAMESPACE } from "../helpers/constants";
import { Cache, Toast } from "@raycast/api";
import Style = Toast.Style;

// Earlier versions cached the resources in the default namespace, in shapes that no longer match the types.
const defaultCache = new Cache();
["isLoading", "lights", "groupedLights", "rooms", "zones", "scenes"].forEach((key) => defaultCache.remove(key));

export function useHueResources() {
  // Holding a brightness or color shortcut changes lights many times a second. Rooms, zones and scenes aren't
  // debounced: the pushed Set Scene reads them through its own hook instance, which only sees flushed writes.
  const cache = { cacheNamespace: RESOURCES_CACHE_NAMESPACE };
  const [lights, setLights] = useCachedState("lights", [] as Light[], { ...cache, cacheWriteDebounce: 1000 });
  const [rooms, setRooms] = useCachedState("rooms", [] as Room[], cache);
  const [zones, setZones] = useCachedState("zones", [] as Zone[], cache);
  const [scenes, setScenes] = useCachedState("scenes", [] as Scene[], cache);
  return { lights, setLights, rooms, setRooms, zones, setZones, scenes, setScenes };
}

export type Hue = ReturnType<typeof useHue>;

export function useHue() {
  const [isLoading, setIsLoading] = useState(true);
  const { setRooms, setZones, ...resources } = useHueResources();
  const { setLights, setScenes } = resources;

  const [hueBridgeState, send] = useMachine(hueBridgeMachine);
  const { hueClient } = hueBridgeState.context;

  useEffect(() => {
    if (hueClient === undefined) return;
    // Show the spinner again when a relink in the same session fetches.
    setIsLoading(true);

    const stopListening = hueClient.listenToEventSource((resources) => {
      const apply = <R extends HueResource>(type: R["type"], setState: React.Dispatch<React.SetStateAction<R[]>>) => {
        const changes = resources.filter((r) => r.type === type) as (DeepPartial<R> & { id: string })[];
        if (changes.length === 0) return;
        setState((items) =>
          changes.reduce((result, change) => updateItems(result, new Map([[change.id, change]])), items),
        );
      };
      apply("light", setLights);
      apply("room", setRooms);
      apply("zone", setZones);
      apply("scene", setScenes);
    });

    (async () => {
      try {
        const resources = await hueClient.getResources();
        setLights(resources.lights);
        setRooms(resources.rooms);
        setZones(resources.zones);
        setScenes(resources.scenes);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        new Toast({
          title: "Error",
          style: Style.Failure,
          message,
        })
          .show()
          .then();
      }

      setIsLoading(false);
    })();

    return stopListening;
  }, [hueClient]);

  return { hueBridgeState, hueClient, send, isLoading, ...resources };
}
