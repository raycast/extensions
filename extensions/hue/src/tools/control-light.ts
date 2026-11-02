import { findLight, omitNull, parseChange, summarize, updateLights, withHueClient } from "../helpers/tools";

type Input = {
  /**
   * Names of the lights, as get-lights gives them
   */
  lights: string[];
  /**
   * A room or zone, to pick between lights with the same name
   */
  room?: string;
  /**
   * true turns the lights on, false turns them off. false can't be combined with other changes.
   */
  on?: boolean;
  /**
   * Brightness in percent, 1 to 100. Turns the lights on.
   */
  brightness?: number;
  /**
   * Percentage points to make lights that are on brighter (positive) or dimmer (negative)
   */
  brightnessChange?: number;
  /**
   * A CSS color name, like "red" or "dark orange", or a hex code like "#ff8800". Turns the lights on and keeps their
   * brightness.
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
 * Turn Hue lights on or off, or change their brightness, color or white temperature. For whole rooms and zones, use
 * control-group.
 */
export default async function tool(input: Input) {
  const { lights: names, room, ...rest } = omitNull(input);
  if (names.length === 0) throw new Error("Give at least one light.");
  const change = parseChange(rest);
  return withHueClient(async (hueClient) => {
    const resources = await hueClient.getResources();
    const lights = names.map((name) => findLight(resources, name, room));
    return summarize(change, await updateLights(hueClient, lights, change, resources.zigbeeConnectivity));
  });
}
