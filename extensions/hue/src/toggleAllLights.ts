import {
  Cache,
  closeMainWindow,
  environment,
  getPreferenceValues,
  showHUD,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import createHueClient, { loadBridgeConfig } from "./lib/createHueClient";
import HueClient from "./lib/HueClient";
import { logError } from "./helpers/errors";

export default async function ToggleAllLights() {
  try {
    const bridgeConfig = await loadBridgeConfig();
    if (bridgeConfig === undefined) throw Error("No Hue Bridge configured");
    const hueClient = await createHueClient(bridgeConfig);

    if (environment.launchType === "userInitiated") {
      await toggleLightsAndNotifyUser(hueClient);
    }

    const resources = await hueClient.getResources();
    const onLights = resources.lights.filter((light) => light.on.on);

    const cache = new Cache();
    for (const [key, items] of Object.entries(resources)) if (items.length > 0) cache.set(key, JSON.stringify(items));

    // Update command metadata
    if (onLights.length === 0) {
      updateCommandMetadata({ subtitle: "All lights are off" }).then();
    } else if (onLights.length === resources.lights.length) {
      updateCommandMetadata({ subtitle: "All lights are on" }).then();
    } else {
      updateCommandMetadata({ subtitle: `${onLights.length} of ${resources.lights.length} lights are on` }).then();
    }
  } catch (error) {
    if (environment.launchType !== "userInitiated" || !(error instanceof Error)) {
      throw error;
    }

    logError(error);
    showHUD(error.message).then();
  } finally {
    if (environment.launchType === "userInitiated") {
      await closeMainWindow();
    }
  }
}

async function toggleLightsAndNotifyUser(hueClient: HueClient): Promise<void> {
  const lights = await hueClient.getLights();
  const onLights = lights.filter((light) => light.on.on);
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
