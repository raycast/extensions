import { useCachedPromise } from "@raycast/utils";
import { useHueBridgeMachine } from "./hueBridgeMachine";
import { handleError } from "./utils";
import { Light, Room, Scene } from "./types";

export type HueMessage = "LINK" | "RETRY" | "DONE" | "UNLINK";
export type SendHueMessage = (message: HueMessage) => void;

export function useHue() {
  const { hueBridgeState, sendHueMessage } = useHueBridgeMachine(() => {
    revalidateLights();
    revalidateRooms();
    revalidateScenes();
  });

  const {
    isLoading: isLoadingLights,
    data: lights,
    mutate: mutateLights,
    revalidate: revalidateLights,
  } = useCachedPromise(
    async () => {
      if (hueBridgeState.context.hueClient === undefined) {
        throw new Error("Hue client is undefined");
      }

      return hueBridgeState.context.hueClient.getLights();
    },
    [],
    {
      keepPreviousData: true,
      initialData: [] as Light[],
      onError: handleError,
      execute: hueBridgeState.context.hueClient !== undefined,
    }
  );

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
    isLoading: isLoadingLights || isLoadingRooms || isLoadingScenes,
    lights,
    mutateLights,
    rooms,
    mutateRooms,
    scenes,
    mutateScenes,
  };
}
