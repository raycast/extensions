import React, { useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { GroupedLight, HasId, Id, Light, Room, Scene, Zone } from "../lib/types";
import { useHueBridgeMachine } from "./useHueBridgeMachine";
import { updateItems } from "../helpers/collections";
import { Toast } from "@raycast/api";
import Style = Toast.Style;

export type HueMessage = "LINK" | "RETRY" | "DONE" | "UNLINK";
export type SendHueMessage = (message: HueMessage) => void;

export function useHue() {
  const [isLoading, setIsLoading] = useCachedState("isLoading", true);
  const [lights, setLights] = useCachedState("lights", [] as Light[]);
  const [groupedLights, setGroupedLights] = useCachedState("groupedLights", [] as GroupedLight[]);
  const [rooms, setRooms] = useCachedState("rooms", [] as Room[]);
  const [zones, setZones] = useCachedState("zones", [] as Zone[]);
  const [scenes, setScenes] = useCachedState("scenes", [] as Scene[]);

  const { hueBridgeState, sendHueMessage } = useHueBridgeMachine();
  const { hueClient } = hueBridgeState.context;

  useEffect(() => {
    if (hueClient === undefined) return;

    const stopListening = hueClient.listenToEventSource((resources) => {
      const apply = <T extends HasId>(type: string, setState: React.Dispatch<React.SetStateAction<T[]>>) => {
        const changes = new Map<Id, Partial<T>>();
        for (const resource of resources.filter((r) => r.type === type) as (Partial<T> & HasId)[]) {
          changes.set(resource.id, { ...changes.get(resource.id), ...resource });
        }
        if (changes.size > 0) setState((items) => updateItems(items, changes));
      };
      apply("light", setLights);
      apply("grouped_light", setGroupedLights);
      apply("room", setRooms);
      apply("zone", setZones);
      apply("scene", setScenes);
    });

    (async () => {
      try {
        // Executing these in parallel causes the API to return an error as if one of the endpoints is not found.
        // Since we’re using HTTP/2 we can just execute them sequentially, and it’s faster anyway.
        setLights(await hueClient.getLights());
        setGroupedLights(await hueClient.getGroupedLights());
        setRooms(await hueClient.getRooms());
        setZones(await hueClient.getZones());
        setScenes(await hueClient.getScenes());
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

  return {
    hueBridgeState,
    sendHueMessage,
    isLoading: isLoading,
    lights,
    setLights,
    groupedLights,
    setGroupedLights,
    rooms,
    setRooms,
    zones,
    setZones,
    scenes,
    setScenes,
  };
}
