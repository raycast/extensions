import React, { useEffect, useRef } from "react";
import { useCachedState, usePromise } from "@raycast/utils";
import { DeepPartial, HueEvent, HueResource, Light, Room, Scene, ZigbeeConnectivity, Zone } from "../lib/types";
import { useMachine } from "@xstate/react";
import { hueBridgeMachine } from "../lib/hueBridgeMachine";
import HueClient from "../lib/HueClient";
import { applyEvent } from "../helpers/collections";
import { rebasePendingWrites } from "../helpers/raycast";
import { RESOURCES_CACHE_NAMESPACE } from "../helpers/constants";
import { Cache, showToast, Toast } from "@raycast/api";

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
  const [zigbeeConnectivity, setZigbeeConnectivity] = useCachedState(
    "zigbeeConnectivity",
    [] as ZigbeeConnectivity[],
    cache,
  );
  return {
    lights,
    setLights,
    rooms,
    setRooms,
    zones,
    setZones,
    scenes,
    setScenes,
    zigbeeConnectivity,
    setZigbeeConnectivity,
  };
}

export type Hue = ReturnType<typeof useHue>;

export function useHue() {
  const { setRooms, setZones, setZigbeeConnectivity, ...resources } = useHueResources();
  const { setLights, setScenes } = resources;

  const [hueBridgeState, send, hueBridgeActor] = useMachine(hueBridgeMachine);
  const { hueClient } = hueBridgeState.context;

  const applyEventToState = (event: HueEvent) => {
    if (event.type === "update" || event.type === "add") rebasePendingWrites(event.data);
    const apply = <R extends HueResource>(type: R["type"], setState: React.Dispatch<React.SetStateAction<R[]>>) => {
      const resources = event.data.filter((r) => r.type === type) as (DeepPartial<R> & { id: string })[];
      if (resources.length === 0) return;
      setState((items) => applyEvent(items, event.type, resources));
    };
    apply("light", setLights);
    apply("room", setRooms);
    apply("zone", setZones);
    apply("scene", setScenes);
    apply("zigbee_connectivity", setZigbeeConnectivity);
  };
  // The resources load one type after another, so an event can be newer than what loaded before it.
  const eventsWhileLoading = useRef<HueEvent[]>(undefined);

  // Declared before the fetch, so it listens before the fetch starts. Closes the client when Unlink drops it or the
  // command closes: stopping the machine runs no exit actions.
  useEffect(() => {
    if (hueClient === undefined) return;
    const stopListening = hueClient.listenToEventSource((event) => {
      eventsWhileLoading.current?.push(event);
      applyEventToState(event);
    });
    return () => {
      stopListening();
      hueClient.close();
    };
  }, [hueClient]);

  // Unlink or a relink replaces the client while its fetch may still be running, and usePromise drops that result.
  const { isLoading, revalidate } = usePromise((hueClient: HueClient) => hueClient.getResources(), [hueClient!], {
    execute: hueClient !== undefined,
    onWillExecute: () => {
      eventsWhileLoading.current = [];
    },
    // The cached state's setters read the latest value, so the events apply over the loaded resources.
    onData: ({ lights, rooms, zones, scenes, zigbeeConnectivity }) => {
      rebasePendingWrites([...lights, ...scenes]);
      setLights(lights);
      setRooms(rooms);
      setZones(zones);
      setScenes(scenes);
      setZigbeeConnectivity(zigbeeConnectivity);
      eventsWhileLoading.current?.forEach(applyEventToState);
      eventsWhileLoading.current = undefined;
    },
    onError: (error) => {
      eventsWhileLoading.current = undefined;
      void showToast({
        style: Toast.Style.Failure,
        title: "Failed to load from bridge",
        message: error.message,
        primaryAction: { title: "Retry", onAction: (toast) => void toast.hide().then(revalidate) },
      });
    },
  });

  // usePromise isn't loading while there is no client to fetch with, but the bridge is still connecting.
  return { hueBridgeState, hueBridgeActor, send, isLoading: isLoading || hueClient === undefined, ...resources };
}
