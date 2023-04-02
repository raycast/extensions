import { getPreferenceValues, Icon, Image, showToast, Toast } from "@raycast/api";
import { CssColor, Light, Scene } from "./types";
import { discovery, v3 } from "node-hue-api";
import { hexToXy } from "./colors";
import {
  APP_NAME,
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  BRIGHTNESS_STEP,
  COLOR_TEMP_MAX,
  COLOR_TEMP_MIN,
  COLOR_TEMPERATURE_STEP,
} from "./constants";
import HueClient from "./HueClient";

declare global {
  interface Array<T extends { id: string }> {
    updateItem(item: T, changes: object): Array<T>;

    updateItems(array: T[], newObjects: T[]): T[];
  }
}

Array.prototype.updateItem = function (item, changes) {
  return this.map((it) => {
    if (it.id !== item.id) return it;
    return { ...it, ...changes };
  });
};

Array.prototype.updateItems = function (array, newItems) {
  return array.map((item) => {
    const foundItem = newItems.find((newItem) => newItem.id === item.id);
    return foundItem ? Object.assign({}, item, foundItem) : item;
  });
};

declare global {
  interface Math {
    clamp(value: number, min: number, max: number): number;
  }
}

Math.clamp = function (value, min, max) {
  return Math.min(Math.max(value, min), max);
};

export function mapRange(value: number, from: [number, number], to: [number, number]) {
  return to[0] + ((value - from[0]) * (to[1] - to[0])) / (from[1] - from[0]);
}

export function getLightIcon(light: Light) {
  // TODO: Use dimming state and color(_temperature) to determine icon color
  // const color = getRgbFrom(lightState);

  return {
    source: `icons/${light.metadata.archetype}.png`,
    tintColor: light.on.on ? "white" : "gray",
  };
}

export function getIconForColor(color: CssColor): Image {
  return { source: Icon.CircleFilled, tintColor: { light: color.value, dark: color.value, adjustContrast: false } };
}

export function getTransitionTimeInMs(): number {
  return Math.round(parseInt(getPreferenceValues().transitionTime) / 100);
}

import Style = Toast.Style;

export function handleError(error: Error): void {
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
export async function discoverBridgeUsingNupnp(): Promise<string> {
  console.info("Discovering bridge using MeetHue's public API…");
  const hueApiResults = await discovery.nupnpSearch();

  if (hueApiResults.length === 0) {
    throw new Error("Could not find a Hue Bridge using MeetHue's public API");
  }

  console.info("Discovered Hue Bridge using MeetHue's public API:", hueApiResults[0].ipaddress);

  // TODO: Handle finding multiple bridges by offering the user to select one
  return hueApiResults[0].ipaddress;
}

/**
 * Ignoring that you could have more than one Hue Bridge on a network as this is unlikely in 99.9% of users situations
 */
export async function discoverBridgeUsingMdns(): Promise<string> {
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

export async function getUsernameFromBridge(ipAddress: string): Promise<string> {
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

export async function turnGroupOn(hueClient: HueClient, group: Group) {
  const api = await apiPromise;
  await api.groups.setGroupState(
    group.id,
    new v3.model.lightStates.GroupLightState().on().transitiontime(getTransitionTimeInMs())
  );
}

export async function turnGroupOff(hueClient: HueClient, group: Group) {
  const api = await apiPromise;
  await api.groups.setGroupState(group.id, new v3.model.lightStates.GroupLightState().off());
}

export async function setGroupBrightness(hueClient: HueClient, group: Group, percentage: number) {
  const api = await apiPromise;
  const newLightState = new v3.model.lightStates.GroupLightState()
    .on()
    .bri(percentage)
    .transitiontime(getTransitionTimeInMs());
  await api.groups.setGroupState(group.id, newLightState);
}

export async function setLightColor(hueClient: HueClient, light: Light, color: string) {
  const api = await apiPromise;
  const xy = hexToXy(color);
  const newLightState = new v3.model.lightStates.LightState().on().xy(xy).transitiontime(getTransitionTimeInMs());
  await api.lights.setLightState(light.id, newLightState);
}

export async function setGroupColor(hueClient: HueClient, group: Group, color: string) {
  const api = await apiPromise;
  const xy = hexToXy(color);
  const newLightState = new v3.model.lightStates.GroupLightState().on().xy(xy).transitiontime(getTransitionTimeInMs());
  await api.groups.setGroupState(group.id, newLightState);
}

export function calculateAdjustedBrightness(light: Light, direction: "increase" | "decrease") {
  if (!light.dimming) {
    throw new Error("Light does not support dimming");
  }

  const newBrightness = light.dimming.brightness + (direction === "increase" ? BRIGHTNESS_STEP : -BRIGHTNESS_STEP);
  const minBrightness = light.dimming.min_dim_level ?? BRIGHTNESS_MIN;

  return Math.clamp(newBrightness, minBrightness, BRIGHTNESS_MAX);
}

export function calculateAdjustedColorTemperature(entity: Light | Group, direction: "increase" | "decrease") {
  const colorTemperature = 295;
  // if ("action" in entity) {
  //   if (entity.action.colormode !== "ct") throw new Error("Light is not in color temperature mode");
  //   colorTemperature = entity.action.ct;
  // } else {
  //   if (entity.state.colormode !== "ct") throw new Error("Light is not in color temperature mode");
  //   colorTemperature = entity.state.ct;
  // }

  const newColorTemperature =
    direction === "increase" ? colorTemperature - COLOR_TEMPERATURE_STEP : colorTemperature + COLOR_TEMPERATURE_STEP;

  return Math.min(Math.max(COLOR_TEMP_MIN, newColorTemperature), COLOR_TEMP_MAX);
}

export async function adjustColorTemperature(
  hueClient: HueClient,
  entity: Light | Group,
  direction: "increase" | "decrease"
) {
  const api = await apiPromise;
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

export async function setScene(hueClient: HueClient, scene: Scene) {
  const api = await apiPromise;
  await api.groups.setGroupState(
    0,
    new v3.model.lightStates.GroupLightState().scene(scene.id).transitiontime(getTransitionTimeInMs())
  );
}
