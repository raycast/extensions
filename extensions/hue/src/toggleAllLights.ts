import { Cache, closeMainWindow, environment, LocalStorage, showHUD, Toast, updateCommandMetadata } from "@raycast/api";
import { BRIDGE_CONFIG_KEY } from "./helpers/constants";
import createHueClient from "./lib/createHueClient";

export default async function ToggleAllLights() {
  if (environment.launchType === "background") {
    await background();
  }

  if (environment.launchType === "userInitiated") {
    await userInitiated();
  }
}

async function userInitiated() {
  try {
    const bridgeConfigString = await LocalStorage.getItem<string>(BRIDGE_CONFIG_KEY);
    if (bridgeConfigString === undefined) throw Error("No Hue Bridge configured");
    const bridgeConfig = JSON.parse(bridgeConfigString);
    const hueClient = await createHueClient(bridgeConfig);
    const lights = await hueClient.getLights();
    const onLights = lights.filter((light) => light.on.on);
    const toast = new Toast({
      style: Toast.Style.Animated,
      title: "",
      message: "Please wait…",
    });

    if (onLights.length === 0) {
      toast.title = "Turning on all lights…";
      toast.show().then();

      const settledTurnLightOnPromises = await Promise.allSettled(
        lights.map((light) => {
          return hueClient.updateLight(light, { on: { on: true } });
        })
      );

      const lightsTurnedOn = settledTurnLightOnPromises.filter((settledPromise) => {
        return settledPromise.status === "fulfilled";
      });
      const lightsFailedToTurnOn = settledTurnLightOnPromises.filter((settledPromise) => {
        return settledPromise.status === "rejected";
      });

      if (lightsTurnedOn.length === 0 && lightsFailedToTurnOn.length > 0) {
        showHUD(`Failed turning on all ${lightsFailedToTurnOn.length} lights.`).then();
      } else if (lightsFailedToTurnOn.length > 0) {
        showHUD(
          `Turned on ${lightsTurnedOn.length} lights, failed turning on ${lightsFailedToTurnOn.length} lights.`
        ).then();
      } else {
        showHUD(`Turned on all ${settledTurnLightOnPromises.length} lights.`).then();
      }
    } else {
      toast.title = "Turning off all lights…";
      toast.show().then();

      const settledTurnLightOffPromises = await Promise.allSettled(
        onLights
          .filter((light) => {
            return light.on.on;
          })
          .map((light) => {
            return hueClient.updateLight(light, { on: { on: false } });
          })
      );

      const lightsTurnedOff = settledTurnLightOffPromises.filter((settledPromise) => {
        return settledPromise.status === "fulfilled";
      });
      const lightsFailedToTurnOff = settledTurnLightOffPromises.filter((settledPromise) => {
        return settledPromise.status === "rejected";
      });

      if (lightsTurnedOff.length === 0 && lightsFailedToTurnOff.length > 0) {
        showHUD(`Failed turning off all ${lightsFailedToTurnOff.length} lights that were on.`).then();
      } else if (lightsFailedToTurnOff.length > 0) {
        showHUD(
          `Turned off ${lightsTurnedOff.length} lights, failed turning off ${lightsFailedToTurnOff.length} lights.`
        ).then();
      } else {
        showHUD(`Turned off all ${settledTurnLightOffPromises.length} lights that were on.`).then();
      }
    }
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    console.error(error.message);
    showHUD(error.message).then();
  } finally {
    // TODO: Update cached state and command metadata
    await closeMainWindow();
  }
}

async function background() {
  const bridgeConfigString = await LocalStorage.getItem<string>(BRIDGE_CONFIG_KEY);
  if (bridgeConfigString === undefined) throw Error("No Hue Bridge configured");
  const bridgeConfig = JSON.parse(bridgeConfigString);
  const hueClient = await createHueClient(bridgeConfig);
  const lights = await hueClient.getLights();
  const onLights = lights.filter((light) => light.on.on);
  const groupedLights = await hueClient.getGroupedLights();
  const zones = await hueClient.getZones();
  const scenes = await hueClient.getScenes();

  // Update cached state
  const cache = new Cache();
  if (lights.length > 0) {
    cache.set("lights", JSON.stringify(lights));
  }
  if (groupedLights.length > 0) {
    cache.set("groupedLights", JSON.stringify(groupedLights));
  }
  if (zones.length > 0) {
    cache.set("zones", JSON.stringify(zones));
  }
  if (scenes.length > 0) {
    cache.set("scenes", JSON.stringify(scenes));
  }

  // Update command metadata
  if (onLights.length === 0) {
    updateCommandMetadata({
      subtitle: "All lights are off",
    }).then();
  } else if (onLights.length === lights.length) {
    updateCommandMetadata({
      subtitle: "All lights are on",
    }).then();
  } else {
    updateCommandMetadata({
      subtitle: `${onLights.length} of ${lights.length} lights are on`,
    }).then();
  }
}
