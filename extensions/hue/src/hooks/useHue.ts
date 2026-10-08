import React, { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { DeepPartial, GroupedLight, HueResource, Light, Room, Scene, Zone } from "../lib/types";
import { useHueBridgeMachine } from "./useHueBridgeMachine";
import { updateItems } from "../helpers/collections";
import { Toast } from "@raycast/api";
import Style = Toast.Style;

export type HueMessage = "LINK" | "RETRY" | "DONE" | "UNLINK";
export type SendHueMessage = (message: HueMessage) => void;

export function useHueResources() {
  // Holding a brightness or color shortcut changes these many times a second. Rooms, zones and scenes aren't
  // debounced: the pushed Set Scene reads them through its own hook instance, which only sees flushed writes.
  const [lights, setLights] = useCachedState("lights", [] as Light[], { cacheWriteDebounce: 1000 });
  const [groupedLights, setGroupedLights] = useCachedState("groupedLights", [] as GroupedLight[], {
    cacheWriteDebounce: 1000,
  });
  const [rooms, setRooms] = useCachedState("rooms", [] as Room[]);
  const [zones, setZones] = useCachedState("zones", [] as Zone[]);
  const [scenes, setScenes] = useCachedState("scenes", [] as Scene[]);
  return { lights, setLights, groupedLights, setGroupedLights, rooms, setRooms, zones, setZones, scenes, setScenes };
}

export function useHue() {
  const [isLoading, setIsLoading] = useState(true);
  const resources = useHueResources();
  const { setLights, setGroupedLights, setRooms, setZones, setScenes } = resources;

  const { hueBridgeState, sendHueMessage } = useHueBridgeMachine();
  const { hueClient } = hueBridgeState.context;

  useEffect(() => {
    if (hueClient === undefined) return;

    const stopListening = hueClient.listenToEventSource((resources) => {
      const apply = <R extends HueResource>(type: R["type"], setState: React.Dispatch<React.SetStateAction<R[]>>) => {
        const changes = resources.filter((r) => r.type === type) as (DeepPartial<R> & { id: string })[];
        if (changes.length === 0) return;
        setState((items) =>
          changes.reduce((result, change) => updateItems(result, new Map([[change.id, change]])), items),
        );
      };
      apply("light", setLights);
      apply("grouped_light", setGroupedLights);
      apply("room", setRooms);
      apply("zone", setZones);
      apply("scene", setScenes);
    });

    (async () => {
      try {
        const resources = await hueClient.getResources();
        setLights(resources.lights);
        setGroupedLights(resources.groupedLights);
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

  return { hueBridgeState, sendHueMessage, isLoading, ...resources };
}
