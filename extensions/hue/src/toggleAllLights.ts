import {
  Cache,
  closeMainWindow,
  environment,
  getPreferenceValues,
  LocalStorage,
  showHUD,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import { BRIDGE_CONFIG_KEY } from "./helpers/constants";
import createHueClient from "./lib/createHueClient";
import { Light } from "./lib/types";
import HueClient from "./lib/HueClient";

export default async function ToggleAllLights() {
  try {
    const bridgeConfigString = await LocalStorage.getItem<string>(BRIDGE_CONFIG_KEY);
    if (bridgeConfigString === undefined) throw Error("No Hue Bridge configured");
    const bridgeConfig = JSON.parse(bridgeConfigString);
    const hueClient = await createHueClient(bridgeConfig);
    const lights = await hueClient.getLights();
    const onLights = lights.filter((light) => light.on.on);

    if (environment.launchType === "userInitiated") {
      await toggleLightsAndNotifyUser(lights, onLights, hueClient);
    }

    const updatedLights = await hueClient.getLights();
    const updatedOnLights = updatedLights.filter((light) => light.on.on);
    const groupedLights = await hueClient.getGroupedLights();
    const zones = await hueClient.getZones();
    const scenes = await hueClient.getScenes();

    const cache = new Cache();
    if (lights.length > 0) {
      cache.set("lights", JSON.stringify(updatedLights));
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
    if (updatedOnLights.length === 0) {
      updateCommandMetadata({ subtitle: "All lights are off" }).then();
    } else if (updatedOnLights.length === lights.length) {
      updateCommandMetadata({ subtitle: "All lights are on" }).then();
    } else {
      updateCommandMetadata({ subtitle: `${updatedOnLights.length} of ${lights.length} lights are on` }).then();
    }
  } catch (error) {
    if (environment.launchType !== "userInitiated" || !(error instanceof Error)) {
      throw error;
    }

    console.error(error.message);
    showHUD(error.message).then();
  } finally {
    if (environment.launchType === "userInitiated") {
      await closeMainWindow();
    }
  }
}

async function toggleLightsAndNotifyUser(lights: Light[], onLights: Light[], hueClient: HueClient): Promise<void> {
  const { toggleAllLights } = getPreferenceValues<Preferences>();
  const toast = new Toast({
    style: Toast.Style.Animated,
    title: "",
    message: "Please wait…",
  });

  const toggleOn = onLights.length === 0 || (toggleAllLights === "on" && lights.length !== onLights.length);
  let toastTitle: string;
  let successMessage: string;
  let failureMessage: string;

  if (toggleOn) {
    toastTitle = "Turning on all lights…";
    successMessage = `Turned on all ${lights.length} lights.`;
    failureMessage = `failed turning on ${lights.length} lights.`;
  } else {
    toastTitle = "Turning off all lights…";
    successMessage = `Turned off all ${onLights.length} lights that were on.`;
    failureMessage = `failed turning off ${onLights.length} lights that were on.`;
  }

  toast.title = toastTitle;
  toast.show().then();

  const settledPromises = await Promise.allSettled(
    lights
      .filter((light) => {
        return toggleOn ? !onLights.includes(light) : onLights.includes(light);
      })
      .map((light) => {
        return hueClient.updateLight(light, { on: { on: toggleOn } });
      }),
  );

  const lightsTurnedOn = settledPromises.filter((p) => p.status === "fulfilled").length;
  const lightsFailed = settledPromises.filter((p) => p.status === "rejected").length;

  if (lightsFailed === 0) {
    showHUD(successMessage).then();
  } else {
    showHUD(`Turned on ${lightsTurnedOn} lights, ${failureMessage}`).then();
  }
}
