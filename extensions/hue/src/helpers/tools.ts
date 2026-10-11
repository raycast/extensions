import { connectToBridge, loadBridgeConfig } from "../lib/hueBridge";
import type HueClient from "../lib/HueClient";
import type { Group, Light, Room, Scene } from "../lib/types";
import { logError } from "./errors";
import { getLightsFromGroup } from "./hueResources";

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
  const [group] = [...named(rooms, name), ...named(zones, name)];
  if (group) return group;
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
