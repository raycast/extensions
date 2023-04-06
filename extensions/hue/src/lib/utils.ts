import { getPreferenceValues, Icon, Image, showToast, Toast } from "@raycast/api";
import { CssColor, Group, HasId, Id, Light, Scene } from "./types";
import { discovery, v3 } from "node-hue-api";
import { APP_NAME, BRIGHTNESSES, MIRED_DEFAULT, MIRED_MAX, MIRED_MIN, MIRED_STEP } from "./constants";
import { miredToHexString, xyToRgbHexString } from "./colors";
import Style = Toast.Style;

declare global {
  interface Array<T extends HasId> {
    updateItem(id: Id, changes: object): T[];

    updateItems(newItems: Partial<T>[]): T[];
  }
}

Array.prototype.updateItem = function (id, changes) {
  return this.map((item) => {
    return id !== item.id ? item : { ...item, ...changes };
  });
};

Array.prototype.updateItems = function (newItems) {
  return this.map((item) => {
    const foundItem = newItems.find((newItem) => newItem.id === item.id);
    return foundItem ? { ...item, ...foundItem } : item;
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

export function getGroupLights(group: Group, lights: Light[]): Light[] {
  return lights.filter((light) =>
    group.children.some((resource) => {
      return resource.rid === light.id || resource.rid === light.owner.rid;
    })
  );
}

export function getLightIcon(light: Light): Image {
  const color = getColorFromLight(light);

  return {
    source: `icons/${light.metadata.archetype}.png`,
    tintColor: light.on.on ? color : "gray",
  };
}

export function getGroupIcon(group: Group): Image {
  return {
    source: `icons/${group.metadata.archetype}.png`,
    // tintColor: group.on ? "white" : "gray",
  };
}

export function getIconForColor(color: CssColor): Image {
  return { source: Icon.CircleFilled, tintColor: { light: color.value, dark: color.value, adjustContrast: false } };
}

export function getTransitionTimeInMs(): number {
  return Math.round(parseInt(getPreferenceValues().transitionTime) / 100);
}

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

/**
 * Because the Hue API does not return the exact brightness value that was set,
 * we need to find the closest brightness so that we can update the UI accordingly.
 */
export function getClosestBrightness(brightness: number) {
  return BRIGHTNESSES.reduce((prev, curr) => {
    return Math.abs(curr - brightness) < Math.abs(prev - brightness) ? curr : prev;
  });
}

export function calculateAdjustedBrightness(brightness: number, direction: "increase" | "decrease") {
  const closestBrightness = getClosestBrightness(brightness);

  return (
    (direction === "increase" ? BRIGHTNESSES : [...BRIGHTNESSES].reverse()).find((b) => {
      return direction === "increase" ? b > closestBrightness : b < closestBrightness;
    }) ?? closestBrightness
  );
}

export function calculateAdjustedColorTemperature(mired: number, direction: "increase" | "decrease") {
  const newColorTemperature = direction === "increase" ? mired - MIRED_STEP : mired + MIRED_STEP;
  return Math.round(Math.min(Math.max(MIRED_MIN, newColorTemperature), MIRED_MAX));
}

export function getColorFromLight(light: Light): string {
  if (light.color?.xy) {
    return xyToRgbHexString(light.color.xy, light.dimming?.brightness);
  }
  if (light.color_temperature?.mirek) {
    return miredToHexString(light.color_temperature.mirek, light.dimming?.brightness);
  }
  return miredToHexString(MIRED_DEFAULT, light.dimming?.brightness);
}

export function getColorsFromScene(scene: Scene): string[] {
  const paletteColors = [
    ...(scene.palette?.color?.map((color) => {
      return xyToRgbHexString(color.color.xy, color.color.dimming?.brightness);
    }) || []),
    ...(scene.palette?.color_temperature?.map((color_temperature) => {
      return miredToHexString(color_temperature.color_temperature.mirek, color_temperature.dimming.brightness);
    }) || []),
    ...(scene.palette?.dimming?.map((dimming) => {
      return miredToHexString(MIRED_DEFAULT, dimming.brightness);
    }) || []),
  ];

  const actionColors =
    scene.actions
      ?.filter((action) => action.action.color || action.action.color_temperature || action.action.dimming)
      .map((action) => {
        if (action.action.color_temperature?.mirek) {
          return miredToHexString(action.action.color_temperature.mirek, action.action.dimming?.brightness);
        }
        if (action.action.color?.xy) {
          return xyToRgbHexString(action.action.color.xy, action.action.dimming?.brightness);
        }
        throw new Error("Invalid state.");
      }) || [];

  return paletteColors.length > 0 ? paletteColors : actionColors;
}
