import { getLightsFromGroup } from "../helpers/hueResources";
import {
  findGroup,
  getGroupedLightId,
  GroupTarget,
  isRelative,
  omitNull,
  parseChange,
  summarize,
  updateGroup,
  updateLights,
  withHueClient,
} from "../helpers/tools";

type Input = {
  /**
   * Names of rooms or zones, as get-lights gives them. Leave out with allLights.
   */
  groups?: string[];
  /**
   * true changes every light instead of rooms or zones
   */
  allLights?: boolean;
  /**
   * true turns the lights on, false turns them off. false can't be combined with other changes.
   */
  on?: boolean;
  /**
   * Brightness in percent, 1 to 100. Turns the lights on.
   */
  brightness?: number;
  /**
   * Percentage points to make lights that are on brighter (positive) or dimmer (negative), each from its own level
   */
  brightnessChange?: number;
  /**
   * A CSS color name, like "red" or "dark orange", or a hex code like "#ff8800". Turns the lights with color on and
   * keeps their brightness.
   */
  color?: string;
  /**
   * White temperature in Kelvin, from warm (2000) to cool (6500). Turns the lights on.
   */
  temperature?: number;
  /**
   * Make the white of lights that are on warmer or cooler by one step
   */
  temperatureChange?: "warmer" | "cooler";
};

/**
 * Turn Hue rooms, zones or all lights on or off, or change their brightness, color or white temperature. For single
 * lights, use control-light; for scenes, recall-scene.
 */
export default async function tool(input: Input) {
  const { groups: names = [], allLights = false, ...rest } = omitNull(input);
  if (names.length > 0 === allLights) throw new Error("Give either groups or allLights.");
  const change = parseChange(rest);
  return withHueClient(async (hueClient) => {
    const resources = await hueClient.getResources();
    const targets: GroupTarget[] = allLights
      ? [
          {
            name: "all lights",
            groupedLightId: getGroupedLightId(await hueClient.getBridgeHome()),
            lights: resources.lights,
          },
        ]
      : // A group named twice changes once.
        [...new Set(names.map((name) => findGroup(resources, name, true)))].map((group) => ({
          name: group.metadata.name,
          groupedLightId: getGroupedLightId(group),
          lights: getLightsFromGroup(resources.lights, group),
        }));
    const lights = targets.flatMap((target) => target.lights);
    // A relative change moves each light from its own level, so a light in two groups would move twice.
    if (isRelative(change) && new Set(lights).size < lights.length) {
      return summarize(change, await updateLights(hueClient, lights, change, resources.zigbeeConnectivity));
    }
    const outcomes = await Promise.all(
      targets.map((target) => updateGroup(hueClient, target, change, resources.zigbeeConnectivity)),
    );
    return summarize(change, outcomes.flat());
  });
}
