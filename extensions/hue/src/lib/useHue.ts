import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { Group, HueMessage, Light, Scene, SendHueMessage } from "./types";
import { useDeepMemo } from "@raycast/utils/dist/useDeepMemo";
import manageHueBridgeMachine from "./manageHueBridgeMachine";
import { useMachine } from "@xstate/react";
import { handleError } from "./hue";
import { Api } from "node-hue-api/dist/esm/api/Api";
import getAuthenticatedApi from "./getAuthenticatedApi";

// TODO: Replace with Hue API V2 (for which there is no library yet) to enable more features.
//  An example is lights have types (e.g. ‘Desk Lamp’ or ‘Ceiling Fixture’) which can be used to display relevant icons instead of circles.
// TODO: Rapid successive calls to mutate functions will result in the optimistic updates and API results being out of sync.
//  This happens for example when holding or successively using the 'Increase' or 'Decrease Brightness' action.
//  This is especially noticeable on groups, since those API calls take longer than those for individual lights.
export function useHue() {
  const hueBridgeMachine = useDeepMemo(() =>
    manageHueBridgeMachine(() => {
      revalidateLights();
      revalidateGroups();
      revalidateScenes();
    })
  );

  const [hueBridgeState, send] = useMachine(hueBridgeMachine);

  const sendHueMessage: SendHueMessage = (message: HueMessage) => {
    send(message.toUpperCase());
  };

  const authenticatedApi: Promise<Api> = useMemo(async () => await getAuthenticatedApi(), []);

  const {
    isLoading: isLoadingLights,
    data: lights,
    mutate: mutateLights,
    revalidate: revalidateLights,
  } = useCachedPromise(
    async () => {
      const lights = await (await authenticatedApi).lights.getAll();
      return lights.map((light) => light["data"] as Light).filter((light) => light != null);
    },
    [],
    {
      keepPreviousData: true,
      initialData: [] as Light[],
      onError: handleError,
    }
  );

  const {
    isLoading: isLoadingGroups,
    data: groups,
    mutate: mutateGroups,
    revalidate: revalidateGroups,
  } = useCachedPromise(
    async () => {
      const groups = await (await authenticatedApi).groups.getAll();
      return groups.map((group) => group["data"] as Group).filter((group) => group != null);
    },
    [],
    {
      keepPreviousData: true,
      initialData: [] as Group[],
      onError: handleError,
    }
  );

  const {
    isLoading: isLoadingScenes,
    data: scenes,
    mutate: mutateScenes,
    revalidate: revalidateScenes,
  } = useCachedPromise(
    async () => {
      const scenes = await (await authenticatedApi).scenes.getAll();
      return scenes.map((scene) => scene["data"] as Scene).filter((scene) => scene != null);
    },
    [],
    {
      keepPreviousData: true,
      initialData: [] as Scene[],
      onError: handleError,
    }
  );

  return {
    hueBridgeState,
    sendHueMessage,
    apiPromise: authenticatedApi,
    isLoading: hueBridgeState.context.shouldDisplay || isLoadingLights || isLoadingGroups || isLoadingScenes,
    lights,
    mutateLights,
    groups,
    mutateGroups,
    scenes,
    mutateScenes,
  };
}
