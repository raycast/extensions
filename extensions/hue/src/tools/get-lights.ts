import { xyToRgbHexString } from "../helpers/colors";
import { getGroupedLightFromGroup, getLightsFromGroup, getScenesFromGroup, isReachable } from "../helpers/hueResources";
import { getRoomOfLight, Resources, withHueClient } from "../helpers/tools";
import type { Group, Light } from "../lib/types";

// Simple types: Raycast's CLI derives a schema from the return type and rejects mixed unions.
type GroupInfo = {
  name: string;
  on: boolean;
  brightness?: number;
  lights: string[];
  scenes: { name: string; active?: boolean }[];
};
type LightInfo = {
  name: string;
  room?: string;
  on: boolean;
  brightness?: number;
  temperature?: number;
  color?: string;
  supports: string[];
  unreachable?: boolean;
};

/**
 * Get the Hue rooms, zones, lights and scenes, with their state. Use it to answer questions about the lights, and to
 * find the exact names the other tools take.
 */
export default function tool(): Promise<{ rooms: GroupInfo[]; zones: GroupInfo[]; lights: LightInfo[] }> {
  return withHueClient(async (hueClient) => describeHome(await hueClient.getResources()));
}

const toKelvin = (mirek: number) => Math.round(1_000_000 / mirek);

function describeHome({ rooms, zones, scenes, lights, zigbeeConnectivity }: Resources) {
  const describeGroup = (group: Group): GroupInfo => {
    const groupedLight = getGroupedLightFromGroup(lights, group);
    return {
      name: group.metadata.name,
      on: groupedLight?.on?.on ?? false,
      ...(groupedLight?.dimming && { brightness: Math.round(groupedLight.dimming.brightness) }),
      lights: getLightsFromGroup(lights, group).map((light) => light.metadata.name),
      scenes: getScenesFromGroup(scenes, group).map(({ metadata, status }) => ({
        name: metadata.name,
        ...((status.active ?? "inactive") !== "inactive" && { active: true }),
      })),
    };
  };
  const describeLight = (light: Light): LightInfo => {
    const room = getRoomOfLight(rooms, light);
    const mirek = light.color_temperature?.mirek_valid ? light.color_temperature.mirek : undefined;
    return {
      name: light.metadata.name,
      ...(room && { room: room.metadata.name }),
      on: light.on.on,
      ...(light.dimming && { brightness: Math.round(light.dimming.brightness) }),
      ...(mirek ? { temperature: toKelvin(mirek) } : light.color && { color: xyToRgbHexString(light.color.xy) }),
      supports: [
        ...(light.dimming ? ["brightness"] : []),
        ...(light.color ? ["color"] : []),
        ...(light.color_temperature ? ["temperature"] : []),
      ],
      ...(!isReachable(light, zigbeeConnectivity) && { unreachable: true }),
    };
  };
  return { rooms: rooms.map(describeGroup), zones: zones.map(describeGroup), lights: lights.map(describeLight) };
}
