import { discovery, v3 } from "node-hue-api";
import { Api } from "node-hue-api/dist/esm/api/Api";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Group, Light, Scene } from "./types";
import { hexToXy } from "./colors";
import {
  APP_NAME,
  BRIDGE_IP_ADDRESS_KEY,
  BRIDGE_USERNAME_KEY,
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  BRIGHTNESS_STEP,
  COLOR_TEMP_MAX,
  COLOR_TEMP_MIN,
  COLOR_TEMPERATURE_STEP,
} from "./constants";
import { CouldNotConnectToHueBridgeError, NoHueBridgeConfiguredError } from "./errors";
import { getTransitionTimeInMs } from "./utils";
import { useMachine } from "@xstate/react";
import { manageHueBridgeMachine } from "./manageHueBridgeMachine";
import Style = Toast.Style;

let _api: Api;

export async function getAuthenticatedApi(): Promise<Api> {
  if (_api) return _api;

  const bridgeIpAddress = await LocalStorage.getItem<string>(BRIDGE_IP_ADDRESS_KEY);
  const bridgeUsername = await LocalStorage.getItem<string>(BRIDGE_USERNAME_KEY);

  if (!bridgeIpAddress || !bridgeUsername) throw new NoHueBridgeConfiguredError();

  try {
    _api = await v3.api.createLocal(bridgeIpAddress).connect(bridgeUsername);
  } catch (error) {
    throw new CouldNotConnectToHueBridgeError();
  }

  return _api;
}

export type SendHueMessage = (message: "link" | "retry" | "done" | "unlink") => void;

// TODO: Replace with Hue API V2 (for which there is no library yet) to enable more features.
//  An example is lights have types (e.g. ‘Desk Lamp’ or ‘Ceiling Fixture’) which can be used to display relevant icons instead of circles.
// TODO: Rapid successive calls to mutate functions will result in the optimistic updates and API results being out of sync.
//  This happens for example when holding or successively using the 'Increase' or 'Decrease Brightness' action.
//  This is especially noticeable on groups, since those API calls take longer than those for individual lights.
export function useHue() {
  const {
    isLoading: isLoadingLights,
    data: lights,
    mutate: mutateLights,
    revalidate: revalidateLights,
  } = useCachedPromise(
    async () => {
      const api = await getAuthenticatedApi();
      const lights = await api.lights.getAll();
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
      const api = await getAuthenticatedApi();
      const groups = await api.groups.getAll();
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
      const api = await getAuthenticatedApi();
      const scenes = await api.scenes.getAll();
      return scenes.map((scene) => scene["data"] as Scene).filter((scene) => scene != null);
    },
    [],
    {
      keepPreviousData: true,
      initialData: [] as Scene[],
      onError: handleError,
    }
  );

  const [hueBridgeState, send] = useMachine(
    manageHueBridgeMachine(() => {
      revalidateLights();
      revalidateGroups();
      revalidateScenes();
    })
  );

  const sendHueMessage: SendHueMessage = (message: "link" | "retry" | "done" | "unlink") => {
    send(message.toUpperCase());
  };

  return {
    hueBridgeState,
    sendHueMessage,
    isLoading: hueBridgeState.context.shouldDisplay || isLoadingLights || isLoadingGroups || isLoadingScenes,
    lights,
    mutateLights,
    groups,
    mutateGroups,
    scenes,
    mutateScenes,
  };
}

function handleError(error: Error): void {
  console.debug({ name: error.name, message: error.message });
  console.error(error);

  if (error.message.match("429")) {
    showToast(
      Style.Failure,
      "Too many requests",
      "Too many requests were sent in a short time. Please try again."
    ).then();
  } else {
    showToast(Style.Failure, "Error", "Something went wrong. Please try again.").then();
  }
}

/**
 * Ignoring that you could have more than one Hue Bridge on a network as this is unlikely in 99.9% of users situations
 */
export async function discoverBridge(): Promise<string> {
  try {
    console.info("Discovering bridge using MeetHue's public API…");
    const hueApiResults = await discovery.nupnpSearch();

    if (hueApiResults.length === 0) {
      throw new Error("Could not find a Hue Bridge");
    }

    console.info("Discovered Hue Bridge using MeetHue's public API:", hueApiResults[0].ipaddress);

    return hueApiResults[0].ipaddress;
  } catch {
    console.info("Could not find a Hue Bridge using MeetHue's public API");
    console.info("Discovering bridge using mDNS…");

    const mDnsResults = await discovery.mdnsSearch(10_000); // 10 seconds
    if (mDnsResults.length === 0) {
      throw new Error("Could not find a Hue Bridge");
    }

    const ipAddress = mDnsResults[0].ipaddress;

    if (ipAddress === undefined) {
      throw new Error("Could not find a Hue Bridge");
    }

    console.info("Discovered Hue Bridge using mDNS:", ipAddress);

    return ipAddress;
  }
}

export async function linkWithBridge(ipAddress: string): Promise<string> {
  // Create an unauthenticated instance of the Hue API so that we can create a new user
  const unauthenticatedApi = await v3.api.createLocal(ipAddress).connect();
  const createdUser = await unauthenticatedApi.users.createUser(APP_NAME, "");

  return createdUser.username;
}

export async function turnOffAllLights() {
  const api = await getAuthenticatedApi();

  const lights = await api.lights.getAll();
  for await (const light of lights) {
    await api.lights.setLightState(
      light.id,
      new v3.model.lightStates.LightState().off().transitiontime(getTransitionTimeInMs())
    );
  }
}

export async function toggleLight(light: Light) {
  const api = await getAuthenticatedApi();
  await api.lights.setLightState(light.id, {
    on: !light.state.on,
    transitiontime: getTransitionTimeInMs(),
  });
}

export async function turnGroupOn(group: Group) {
  const api = await getAuthenticatedApi();
  await api.groups.setGroupState(
    group.id,
    new v3.model.lightStates.GroupLightState().on().transitiontime(getTransitionTimeInMs())
  );
}

export async function turnGroupOff(group: Group) {
  const api = await getAuthenticatedApi();
  await api.groups.setGroupState(group.id, new v3.model.lightStates.GroupLightState().off());
}

export async function setLightBrightness(light: Light, percentage: number) {
  const api = await getAuthenticatedApi();
  const newLightState = new v3.model.lightStates.LightState()
    .on()
    .bri(percentage)
    .transitiontime(getTransitionTimeInMs());
  await api.lights.setLightState(light.id, newLightState);
}

export async function setGroupBrightness(group: Group, percentage: number) {
  const api = await getAuthenticatedApi();
  const newLightState = new v3.model.lightStates.GroupLightState()
    .on()
    .bri(percentage)
    .transitiontime(getTransitionTimeInMs());
  await api.groups.setGroupState(group.id, newLightState);
}

export async function setLightColor(light: Light, color: string) {
  const api = await getAuthenticatedApi();
  const xy = hexToXy(color);
  const newLightState = new v3.model.lightStates.LightState().on().xy(xy).transitiontime(getTransitionTimeInMs());
  await api.lights.setLightState(light.id, newLightState);
}

export async function setGroupColor(group: Group, color: string) {
  const api = await getAuthenticatedApi();
  const xy = hexToXy(color);
  const newLightState = new v3.model.lightStates.GroupLightState().on().xy(xy).transitiontime(getTransitionTimeInMs());
  await api.groups.setGroupState(group.id, newLightState);
}

export function calculateAdjustedBrightness(entity: Light | Group, direction: "increase" | "decrease") {
  let brightness;
  if ("action" in entity) {
    brightness = entity.action.bri;
  } else {
    brightness = entity.state.bri;
  }

  const newBrightness = direction === "increase" ? brightness + BRIGHTNESS_STEP : brightness - BRIGHTNESS_STEP;

  return Math.min(Math.max(BRIGHTNESS_MIN, newBrightness), BRIGHTNESS_MAX);
}

export async function adjustBrightness(entity: Light | Group, direction: "increase" | "decrease") {
  const api = await getAuthenticatedApi();
  const delta = direction === "increase" ? BRIGHTNESS_STEP : -BRIGHTNESS_STEP;

  if ("action" in entity) {
    const newLightState = new v3.model.lightStates.GroupLightState()
      .on()
      .bri_inc(delta)
      .transitiontime(getTransitionTimeInMs());
    await api.groups.setGroupState(entity.id, newLightState);
  } else {
    const newLightState = new v3.model.lightStates.LightState()
      .on()
      .bri_inc(delta)
      .transitiontime(getTransitionTimeInMs());
    await api.lights.setLightState(entity.id, newLightState);
  }
}

export function calculateAdjustedColorTemperature(entity: Light | Group, direction: "increase" | "decrease") {
  let colorTemperature;
  if ("action" in entity) {
    if (entity.action.colormode !== "ct") throw new Error("Light is not in color temperature mode");
    colorTemperature = entity.action.ct;
  } else {
    if (entity.state.colormode !== "ct") throw new Error("Light is not in color temperature mode");
    colorTemperature = entity.state.ct;
  }

  const newColorTemperature =
    direction === "increase" ? colorTemperature - COLOR_TEMPERATURE_STEP : colorTemperature + COLOR_TEMPERATURE_STEP;

  return Math.min(Math.max(COLOR_TEMP_MIN, newColorTemperature), COLOR_TEMP_MAX);
}

export async function adjustColorTemperature(entity: Light | Group, direction: "increase" | "decrease") {
  const api = await getAuthenticatedApi();
  const delta = direction === "increase" ? -COLOR_TEMPERATURE_STEP : COLOR_TEMPERATURE_STEP;

  if ("action" in entity) {
    const newLightState = new v3.model.lightStates.GroupLightState()
      .on()
      .ct_inc(delta)
      .transitiontime(getTransitionTimeInMs());
    await api.groups.setGroupState(entity.id, newLightState);
  } else {
    const newLightState = new v3.model.lightStates.LightState()
      .on()
      .ct_inc(delta)
      .transitiontime(getTransitionTimeInMs());
    await api.lights.setLightState(entity.id, newLightState);
  }
}

export async function setScene(scene: Scene) {
  const api = await getAuthenticatedApi();
  await api.groups.setGroupState(
    0,
    new v3.model.lightStates.GroupLightState().scene(scene.id).transitiontime(getTransitionTimeInMs())
  );
}
