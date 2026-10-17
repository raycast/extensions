import {
  Cache,
  environment,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import { connectToBridge, createHueClient, loadBridgeConfig } from "./lib/hueBridge";
import HueClient from "./lib/HueClient";
import { logError } from "./helpers/errors";
import { RESOURCES_CACHE_NAMESPACE } from "./helpers/constants";

export default async function ToggleAllLights() {
  try {
    const bridgeConfig = await loadBridgeConfig();
    if (bridgeConfig === undefined) throw Error("No Hue Bridge configured");
    // Background runs don't look for a bridge that moved, as MeetHue's discovery allows one request per 15 minutes.
    const hueClient = await (environment.launchType === "userInitiated" ? connectToBridge : createHueClient)(
      bridgeConfig,
    );

    if (environment.launchType === "userInitiated") {
      await toggleLightsAndNotifyUser(hueClient);
    }

    const resources = await hueClient.getResources();
    const onCount = resources.lights.filter((light) => light.on.on).length;

    const cache = new Cache({ namespace: RESOURCES_CACHE_NAMESPACE });
    for (const [key, items] of Object.entries(resources)) if (items.length > 0) cache.set(key, JSON.stringify(items));

    const subtitle =
      onCount === 0
        ? "All lights are off"
        : onCount === resources.lights.length
          ? "All lights are on"
          : `${onCount} of ${resources.lights.length} lights are on`;
    await updateCommandMetadata({ subtitle });
  } catch (error) {
    if (environment.launchType !== "userInitiated" || !(error instanceof Error)) {
      throw error;
    }

    logError(error);
    await showHUD(error.message);
  }
}

async function toggleLightsAndNotifyUser(hueClient: HueClient): Promise<void> {
  const lights = await hueClient.getLights();
  const onCount = lights.filter((light) => light.on.on).length;
  const { toggleAllLights } = getPreferenceValues<Preferences>();
  const toggleOn = onCount === 0 || (toggleAllLights === "on" && onCount !== lights.length);
  const onOrOff = toggleOn ? "on" : "off";

  showToast({ style: Toast.Style.Animated, title: `Turning ${onOrOff} all lights…`, message: "Please wait…" }).then();

  const results = await Promise.allSettled(
    lights
      .filter((light) => light.on.on !== toggleOn)
      .map((light) => hueClient.updateLight(light, { on: { on: toggleOn } })),
  );
  const failed = results.filter((result) => result.status === "rejected").length;

  await showHUD(
    failed > 0
      ? `Turned ${onOrOff} ${results.length - failed} lights, failed turning ${onOrOff} ${failed}.`
      : toggleOn
        ? `Turned on all ${lights.length} lights.`
        : `Turned off all ${onCount} lights that were on.`,
  );
}
