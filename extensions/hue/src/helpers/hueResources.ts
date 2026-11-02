import { DeepPartial, Group, GroupedLight, Id, Light, Palette, Scene, ZigbeeConnectivity } from "../lib/types";
import { miredToHexString, xyToMired, xyToRgbHexString } from "./colors";
import { MIRED_DEFAULT } from "./constants";
import { byName } from "./collections";
import chroma from "chroma-js";

export function getLightsFromGroup(lights: Light[], group: Group): Light[] {
  return lights.filter((light) =>
    group.children.some((resource) => {
      return resource.rid === light.id || resource.rid === light.owner.rid;
    }),
  );
}

// The bridge tracks connectivity per device, which owns both the light and its zigbee_connectivity.
export const isReachable = (light: Light, zigbeeConnectivity: ZigbeeConnectivity[]) =>
  (zigbeeConnectivity.find(({ owner }) => owner.rid === light.owner.rid)?.status ?? "connected") === "connected";

export type GroupedLightState = Pick<GroupedLight, "id" | "on" | "dimming">;

// The group's grouped light as the bridge aggregates it: on while any of its lights is on, at the average brightness of
// the dimmable lights that are on, or 0 while they're all off.
export function getGroupedLightFromGroup(lights: Light[], group: Group): GroupedLightState | undefined {
  const id = group.services.find((service) => service.rtype === "grouped_light")?.rid;
  if (id === undefined) return undefined;
  const groupLights = getLightsFromGroup(lights, group);
  const brightnesses = groupLights.flatMap((light) => (light.on.on && light.dimming ? [light.dimming.brightness] : []));
  return {
    id,
    on: { on: groupLights.some((light) => light.on.on) },
    ...(groupLights.some((light) => light.dimming) && {
      dimming: { brightness: brightnesses.reduce((sum, b) => sum + b, 0) / (brightnesses.length || 1) },
    }),
  };
}

export const getScenesFromGroup = (scenes: Scene[], group: Group) =>
  scenes.filter((scene) => scene.group.rid === group.id).sort(byName);

// The bridge marks a recalled scene static, and every other active scene with one of its lights inactive. Without a
// recall, active scenes end when one of their lights is switched on or off or changes color, but not when it dims.
export function getSceneChanges(
  scenes: Scene[],
  lights: Light[],
  changes: Map<Id, DeepPartial<Light>>,
  recalled?: Scene,
) {
  const ending = new Set(
    lights.flatMap((light) => {
      const change = changes.get(light.id);
      if (change === undefined) return [];
      const isSwitched = change.on !== undefined && change.on.on !== light.on.on;
      const isEnding = recalled || isSwitched || change.color !== undefined || change.color_temperature !== undefined;
      return isEnding ? [light.id] : [];
    }),
  );
  return new Map(
    scenes.flatMap((scene): [Id, DeepPartial<Scene>][] => {
      if (scene.id === recalled?.id) return [[scene.id, { status: { active: "static" } }]];
      const isEnded = scene.status.active !== "inactive" && scene.actions.some(({ target }) => ending.has(target.rid));
      return isEnded ? [[scene.id, { status: { active: "inactive" } }]] : [];
    }),
  );
}

// The Hue app's color for a light without color or color temperature, like a plug, read from its room cards.
const PLAIN_LIGHT_COLOR = "#ffde8b";

// At full brightness: tiles show brightness with their shading.
export function getColorFromLight(light: Light): string {
  if (light.color_temperature?.mirek) return miredToHexString(light.color_temperature.mirek);
  if (light.color?.xy) return xyToRgbHexString(light.color.xy);
  return PLAIN_LIGHT_COLOR;
}

// In color mode a light has no color temperature, so the temperature actions start from the white nearest its color,
// or from the middle of the light's range when the color is far from white.
export function getMiredFromLight({ color_temperature, color }: Light): number {
  if (!color_temperature) return MIRED_DEFAULT;
  const { mirek_minimum, mirek_maximum } = color_temperature.mirek_schema;
  return color_temperature.mirek ?? (color && xyToMired(color.xy)) ?? (mirek_minimum + mirek_maximum) / 2;
}

// Like the Hue app, palettes have one entry per color, not per light. Colors closer than ΔE 5 count as one, so lights a
// few mirek apart do too, while 2200K and 2700K stay apart.
const distinctColors = (colors: string[]) =>
  colors.reduce<string[]>(
    (kept, color) => (kept.some((k) => chroma.deltaE(k, color) < 5) ? kept : [...kept, color]),
    [],
  );

// Grays, like a light set to White, have no hue, which chroma gives as NaN, so they sort with the reds.
const hue = (color: string) => chroma(color).get("hsl.h") || 0;

// The Hue app shows the colors of the lights that are on, warm to cool.
export const getColorsFromGroup = (lights: Light[], group: Group): Palette =>
  distinctColors(
    getLightsFromGroup(lights, group)
      .filter((light) => light.on.on)
      .map(getColorFromLight),
  ).sort((a, b) => hue(a) - hue(b));

// The brightness the scene's lights get, averaged like a room's grouped light.
export function getBrightnessFromScene({ actions }: Scene): number {
  const brightnesses = actions.flatMap(({ action }) =>
    action.on?.on && action.dimming ? [action.dimming.brightness] : [],
  );
  return brightnesses.length > 0 ? brightnesses.reduce((sum, b) => sum + b, 0) / brightnesses.length : 100;
}

export function getColorsFromScene({ palette, actions }: Scene): Palette {
  // Color sources in priority order, at full brightness like getColorFromLight
  const sources = [
    () => palette?.color.map(({ color }) => xyToRgbHexString(color.xy)),
    () => actions.flatMap(({ action }) => (action.color ? [xyToRgbHexString(action.color.xy)] : [])),
    () => palette?.color_temperature.map(({ color_temperature }) => miredToHexString(color_temperature.mirek)),
    () =>
      actions.flatMap(({ action }) =>
        action.color_temperature ? [miredToHexString(action.color_temperature.mirek)] : [],
      ),
    () => (palette?.dimming.length || actions.some(({ action }) => action.dimming) ? [PLAIN_LIGHT_COLOR] : []),
  ];

  for (const source of sources) {
    const colors = distinctColors(source() ?? []);
    if (colors.length > 0) return colors;
  }
  return [];
}
