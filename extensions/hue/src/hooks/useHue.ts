import { useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { GroupedLight, Light, Room, Scene, Zone } from "../lib/types";
import { useHueBridgeMachine } from "./useHueBridgeMachine";
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

  const { hueBridgeState, sendHueMessage } = useHueBridgeMachine(
    setLights,
    setGroupedLights,
    setRooms,
    setZones,
    setScenes,
  );

  useEffect(() => {
    if (hueBridgeState.context.hueClient !== undefined) {
      (async () => {
        if (hueBridgeState.context.hueClient === undefined) {
          throw new Error("hueClient is undefined");
        }

        try {
          // Executing these in parallel causes the API to return an error as if one of the endpoints is not found.
          // Since we’re using HTTP/2 we can just execute them sequentially, and it’s faster anyway.
          setLights(await hueBridgeState.context.hueClient.getLights());
          setGroupedLights(await hueBridgeState.context.hueClient.getGroupedLights());
          setRooms(await hueBridgeState.context.hueClient.getRooms());
          setZones(await hueBridgeState.context.hueClient.getZones());
          setScenes(await hueBridgeState.context.hueClient.getScenes());
        } catch (error) {
          const message = error instanceof Error ? error.message : (error as string);
          new Toast({
            title: "Error",
            style: Style.Failure,
            message: message,
          })
            .show()
            .then();
        }

        setIsLoading(false);
      })();
    }
  }, [hueBridgeState.context.hueClient]);

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
