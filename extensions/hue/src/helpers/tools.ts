import chroma from "chroma-js";
import { connectToBridge, loadBridgeConfig } from "../lib/hueBridge";
import type HueClient from "../lib/HueClient";
import type { Group, Light, LightRequest, ResourceIdentifier, Room, Scene, ZigbeeConnectivity } from "../lib/types";
import { hexToXy } from "./colors";
import { MIRED_STEP } from "./constants";
import { logError } from "./errors";
import { getLightsFromGroup, isReachable } from "./hueResources";

export type Resources = Awaited<ReturnType<HueClient["getResources"]>>;

// One connection per tool call, closed after it, also when it fails. connectToBridge rediscovers a bridge that moved:
// a tool call always comes from someone asking.
export async function withHueClient<T>(run: (hueClient: HueClient) => Promise<T>): Promise<T> {
  let hueClient: HueClient | undefined;
  try {
    const bridgeConfig = await loadBridgeConfig();
    if (bridgeConfig === undefined) throw new Error("No Hue Bridge configured");
    hueClient = await connectToBridge(bridgeConfig);
    return await run(hueClient);
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    hueClient?.close();
  }
}

type Named = { metadata: { name: string } };
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const named = <T extends Named>(items: T[], name: string) => items.filter((item) => sameName(item.metadata.name, name));
const names = (items: Named[]) => items.map((item) => item.metadata.name).join(", ");

export const getRoomOfLight = (rooms: Room[], light: Light) =>
  rooms.find((room) => getLightsFromGroup([light], room).length > 0);

const withRoom = (rooms: Room[], light: Light) => {
  const room = getRoomOfLight(rooms, light);
  return room ? `${light.metadata.name} (${room.metadata.name})` : light.metadata.name;
};

// A room wins over a zone with the same name. Control Group's targets get hints the room and group inputs of the
// other tools don't.
export function findGroup({ rooms, zones, lights }: Resources, name: string, forControlGroup = false): Group {
  const matches = [named(rooms, name), named(zones, name)].find((matches) => matches.length > 0) ?? [];
  if (matches.length > 1) {
    throw new Error(
      `${matches.length} ${matches[0].type}s match ${name}: ${names(matches)}. Rename one in the Hue app.`,
    );
  }
  if (matches.length === 1) return matches[0];
  if (named(lights, name).length > 0) {
    throw new Error(
      forControlGroup ? `${name} is a light: use Control Light.` : `${name} is a light, not a room or zone.`,
    );
  }
  const hint = forControlGroup ? " For every light, use allLights." : "";
  throw new Error(`No room or zone named ${name}. Rooms: ${names(rooms)}. Zones: ${names(zones)}.${hint}`);
}

export function findLight(resources: Resources, name: string, room?: string): Light {
  const { rooms, zones, lights } = resources;
  const candidates = room === undefined ? lights : getLightsFromGroup(lights, findGroup(resources, room));
  const matches = named(candidates, name);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const list = matches.map((light) => withRoom(rooms, light)).join(", ");
    const hint = room === undefined ? " Pass room to pick one." : "";
    throw new Error(`${matches.length} lights are named ${name}: ${list}.${hint}`);
  }
  const [group] = [...named(rooms, name), ...named(zones, name)];
  if (group) throw new Error(`${name} is a ${group.type}: use Control Group.`);
  const list = candidates.map((light) => withRoom(rooms, light)).join(", ");
  throw new Error(`No light named ${name}${room === undefined ? "" : ` in ${room}`}. Lights: ${list}.`);
}

export function findScene(resources: Resources, name: string, groupName?: string): { scene: Scene; group: string } {
  const { rooms, zones, scenes } = resources;
  const groupOf = (scene: Scene) =>
    [...rooms, ...zones].find(({ id }) => id === scene.group.rid)?.metadata.name ?? scene.group.rtype;
  const group = groupName === undefined ? undefined : findGroup(resources, groupName);
  const candidates = group ? scenes.filter((scene) => scene.group.rid === group.id) : scenes;
  const matches = named(candidates, name);
  if (matches.length === 1) return { scene: matches[0], group: groupOf(matches[0]) };
  if (matches.length > 1) {
    throw new Error(`${name} is a scene in ${matches.map(groupOf).join(", ")}. Pass group to pick one.`);
  }
  if (group) throw new Error(`${group.metadata.name} has no scene named ${name}. Its scenes: ${names(candidates)}.`);
  const list = scenes.map((scene) => `${scene.metadata.name} (${groupOf(scene)})`).join(", ");
  throw new Error(`No scene named ${name}. Scenes: ${list}.`);
}

export type Change = {
  on?: boolean;
  brightness?: number;
  brightnessChange?: number;
  color?: string;
  temperature?: number;
  temperatureChange?: "warmer" | "cooler";
};

export const isRelative = ({ brightnessChange, temperatureChange }: Change) =>
  brightnessChange !== undefined || temperatureChange !== undefined;
// chroma reads CSS names without spaces, like "darkred".
const parseColor = (color: string) => chroma(color.replace(/\s+/g, "").toLowerCase());
const toMirek = (kelvin: number) => Math.round(1_000_000 / kelvin);

export function checkBrightness(brightness: number, hint = "") {
  if (!(brightness >= 1 && brightness <= 100)) throw new Error(`Brightness ${brightness} is outside 1-100.${hint}`);
}

// Models may fill optional inputs with null.
export const omitNull = <T extends object>(input: T) =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null)) as T;

// Picks the change from a tool's other inputs, so a stray one, like a scene sent to Control Group, isn't one.
export function parseChange({ on, brightness, brightnessChange, color, temperature, temperatureChange }: Change) {
  const change: Change = { on, brightness, brightnessChange, color, temperature, temperatureChange };
  const given = Object.values(change).filter((value) => value !== undefined).length;
  if (given === 0) {
    throw new Error(
      "Nothing to change: give on, brightness, brightnessChange, color, temperature or temperatureChange.",
    );
  }
  if (on === false && given > 1) throw new Error("Turning off can't be combined with other changes.");
  if (isRelative(change) && [on, brightness, color, temperature].some((value) => value !== undefined)) {
    throw new Error(
      "brightnessChange and temperatureChange can't be combined with on, brightness, color or temperature.",
    );
  }
  if (brightness !== undefined) checkBrightness(brightness, " To turn lights off, use on: false.");
  if (brightnessChange !== undefined && !(brightnessChange !== 0 && Math.abs(brightnessChange) <= 100)) {
    throw new Error(`brightnessChange ${brightnessChange} is outside -100 to 100, or 0.`);
  }
  if ([color, temperature, temperatureChange].filter((value) => value !== undefined).length > 1) {
    throw new Error("Give only one of color, temperature and temperatureChange.");
  }
  if (color !== undefined && !chroma.valid(color.replace(/\s+/g, "").toLowerCase())) {
    throw new Error(`Unknown color ${color}: use a CSS color name or a hex code like #ff8800.`);
  }
  if (temperature !== undefined && !(temperature >= 1000 && temperature <= 20000)) {
    throw new Error(`Temperature ${temperature}K is outside 1000-20000K. Temperature is in Kelvin, like 2700.`);
  }
  return change;
}

type ChangeRequest = Pick<
  LightRequest,
  "on" | "dimming" | "dimming_delta" | "color" | "color_temperature" | "color_temperature_delta"
>;

// Absolute changes turn lights on. Deltas leave lights that are off alone: with on, one probed light came on at 0%.
function getRequest(change: Change, mirek?: number): ChangeRequest {
  const { on, brightness, brightnessChange, color, temperatureChange } = change;
  const request: ChangeRequest = {};
  if (on !== undefined || !isRelative(change)) request.on = { on: on ?? true };
  if (brightness !== undefined) request.dimming = { brightness };
  if (brightnessChange !== undefined) {
    request.dimming_delta = {
      action: brightnessChange > 0 ? "up" : "down",
      brightness_delta: Math.abs(brightnessChange),
    };
  }
  if (color !== undefined) request.color = { xy: hexToXy(parseColor(color).hex()).xy };
  if (mirek !== undefined) request.color_temperature = { mirek };
  if (temperatureChange !== undefined) {
    request.color_temperature_delta = {
      action: temperatureChange === "warmer" ? "up" : "down",
      mirek_delta: Math.round(MIRED_STEP),
    };
  }
  return request;
}

type Abilities = { on: boolean; dimming: boolean; color: boolean; temperature: boolean };

function getMissing(change: Change, can: Abilities): string | undefined {
  if ((change.brightness ?? change.brightnessChange) !== undefined && !can.dimming) return "no brightness";
  if (change.color !== undefined && !can.color) return "no color";
  if ((change.temperature ?? change.temperatureChange) !== undefined && !can.temperature) return "no white temperature";
  if (isRelative(change) && !can.on) return "off";
}

export type Outcome = { name: string; skipped?: string; failed?: string; limit?: number };

const failure = (name: string, error: unknown): Outcome => ({
  name,
  failed: error instanceof Error ? error.message : String(error),
});

// Through the client's lights queue, like Toggle All Lights. A light named twice changes once.
export function updateLights(
  hueClient: Pick<HueClient, "updateLight">,
  lights: Light[],
  change: Change,
  zigbeeConnectivity: ZigbeeConnectivity[],
): Promise<Outcome[]> {
  return Promise.all(
    [...new Set(lights)].map(async (light): Promise<Outcome> => {
      const name = light.metadata.name;
      if (!isReachable(light, zigbeeConnectivity)) return { name, skipped: "unreachable" };
      const skipped = getMissing(change, {
        on: light.on.on,
        dimming: light.dimming !== undefined,
        color: light.color !== undefined,
        temperature: light.color_temperature !== undefined,
      });
      if (skipped) return { name, skipped };
      // Clamped to the light's range, so the summary can say where it stopped.
      const schema = light.color_temperature?.mirek_schema;
      const wanted = change.temperature === undefined ? undefined : toMirek(change.temperature);
      const mirek =
        wanted === undefined || !schema
          ? wanted
          : Math.min(Math.max(wanted, schema.mirek_minimum), schema.mirek_maximum);
      try {
        await hueClient.updateLight(light, getRequest(change, mirek));
      } catch (error) {
        return failure(name, error);
      }
      return mirek === wanted ? { name } : { name, limit: Math.round(1_000_000 / mirek!) };
    }),
  );
}

export const getGroupedLightId = ({ services }: { services: ResourceIdentifier[] }) =>
  services.find(({ rtype }) => rtype === "grouped_light")?.rid;

export type GroupTarget = { name: string; groupedLightId?: string; lights: Light[] };

// The grouped light moves each light from its own level and clips temperatures to each light's range. The bridge
// rejects grouped color, so colors go to each light.
export async function updateGroup(
  hueClient: Pick<HueClient, "updateLight" | "updateGroupedLight">,
  { name, groupedLightId, lights }: GroupTarget,
  change: Change,
  zigbeeConnectivity: ZigbeeConnectivity[],
): Promise<Outcome[]> {
  if (groupedLightId === undefined) return [{ name, skipped: "no lights" }];
  if (change.color !== undefined) return updateLights(hueClient, lights, change, zigbeeConnectivity);
  const skipped = getMissing(change, {
    on: lights.some((light) => light.on.on),
    dimming: lights.some((light) => light.dimming !== undefined),
    color: true,
    temperature: lights.some((light) => light.color_temperature !== undefined),
  });
  if (skipped) return [{ name, skipped }];
  const mirek = change.temperature === undefined ? undefined : toMirek(change.temperature);
  try {
    await hueClient.updateGroupedLight({ id: groupedLightId }, getRequest(change, mirek));
  } catch (error) {
    return [failure(name, error)];
  }
  const unreachable = lights.filter((light) => !isReachable(light, zigbeeConnectivity));
  return [{ name }, ...unreachable.map((light) => ({ name: light.metadata.name, skipped: "unreachable" }))];
}

const and = (names: string[]) =>
  names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
// Overlapping groups, like a room and a zone spanning it, report a light once.
const namesOf = (outcomes: Outcome[]) => and([...new Set(outcomes.map(({ name }) => name))]);

function describeChange(
  { on, brightness, brightnessChange, color, temperature, temperatureChange }: Change,
  names: string,
) {
  if (on === false) return `Turned off ${names}`;
  const relative = [
    brightnessChange !== undefined && `${Math.abs(brightnessChange)}% ${brightnessChange > 0 ? "brighter" : "dimmer"}`,
    temperatureChange,
  ].filter(Boolean);
  if (relative.length > 0) return `Made ${names} ${relative.join(" and ")}`;
  const values = [brightness !== undefined && `${brightness}%`, color, temperature !== undefined && `${temperature}K`];
  const set = values.filter(Boolean);
  return set.length > 0 ? `Set ${names} to ${set.join(" and ")}` : `Turned on ${names}`;
}

// Throws only when nothing changed and something failed, so the AI sees the bridge's errors.
export function summarize(change: Change, outcomes: Outcome[]): string {
  const changed = outcomes.filter(({ skipped, failed }) => !skipped && !failed);
  const reasons = [...new Set(outcomes.flatMap(({ skipped }) => (skipped ? [skipped] : [])))];
  const notes = [
    ...reasons.map((reason) => `Skipped ${namesOf(outcomes.filter((o) => o.skipped === reason))}: ${reason}.`),
    ...outcomes.flatMap(({ name, failed }) => (failed ? [`Failed ${name}: ${failed}.`] : [])),
    ...changed.flatMap(({ name, limit }) => (limit ? [`${name} stopped at ${limit}K, its limit.`] : [])),
  ];
  if (changed.length === 0 && outcomes.some(({ failed }) => failed)) throw new Error(notes.join(" "));
  const head = changed.length > 0 ? `${describeChange(change, namesOf(changed))}.` : "Nothing changed.";
  return [head, ...notes].join(" ");
}
