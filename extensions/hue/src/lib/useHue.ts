import { useEffect } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useHueBridgeMachine } from "./hueBridgeMachine";
import { handleError } from "./utils";
import { Light, Room, Scene } from "./types";

export type HueMessage = "LINK" | "RETRY" | "DONE" | "UNLINK";
export type SendHueMessage = (message: HueMessage) => void;

export function useHue() {
  const [lights, setLights] = useCachedState("lights", [] as Light[]);

  const { hueBridgeState, sendHueMessage } = useHueBridgeMachine(setLights);

  useEffect(() => {
    const fetchData = async () => {
      const lights = await hueBridgeState.context.hueClient?.getLights();
      if (lights === undefined) {
        throw new Error("Lights are undefined");
      }
      setLights(lights);
    };

    if (hueBridgeState.context.hueClient !== undefined) {
      fetchData().then();
    }
  }, [hueBridgeState.context.hueClient]);

  const {
    isLoading: isLoadingRooms,
    data: rooms,
    mutate: mutateRooms,
    revalidate: revalidateRooms,
  } = useCachedPromise(
    async () => {
      if (hueBridgeState.context.hueClient === undefined) {
        throw new Error("Hue client is undefined");
      }

      return hueBridgeState.context.hueClient.getRooms();
    },
    [],
    {
      keepPreviousData: true,
      initialData: [] as Room[],
      onError: handleError,
      execute: hueBridgeState.context.hueClient !== undefined,
    }
  );

  const {
    isLoading: isLoadingScenes,
    data: scenes,
    mutate: mutateScenes,
    revalidate: revalidateScenes,
  } = useCachedPromise(
    async () => {
      if (hueBridgeState.context.hueClient === undefined) {
        throw new Error("Hue client is undefined");
      }

      return hueBridgeState.context.hueClient.getScenes();
    },
    [],
    {
      keepPreviousData: true,
      initialData: [] as Scene[],
      onError: handleError,
      execute: hueBridgeState.context.hueClient !== undefined,
    }
  );

  // TODO: Add zones and grouped lights
  return {
    hueBridgeState,
    sendHueMessage,
    isLoading: !lights.length || isLoadingRooms || isLoadingScenes,
    lights,
    setLights: setLights,
    rooms,
    mutateRooms,
    scenes,
    mutateScenes,
  };
}
