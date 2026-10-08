import { Group, GroupedLight, Light, Palette, Scene } from "../lib/types";
import { miredToHexString, xyToMired, xyToRgbHexString } from "./colors";
import { MIRED_DEFAULT } from "./constants";
import { byName } from "./collections";
import { environment } from "@raycast/api";
import { existsSync } from "fs";
import chroma from "chroma-js";

export function getLightsFromGroup(lights: Light[], group: Group): Light[] {
  return lights.filter((light) =>
    group.children.some((resource) => {
      return resource.rid === light.id || resource.rid === light.owner.rid;
    }),
  );
}

export const getGroupedLightFromGroup = (groupedLights: GroupedLight[], group: Group) =>
  groupedLights.find((gl) => group.services.some((s) => s.rtype === "grouped_light" && s.rid === gl.id));

export const getScenesFromGroup = (scenes: Scene[], group: Group) =>
  scenes.filter((scene) => scene.group.rid === group.id).sort(byName);

function getIconPath(name: string, fallback: string, color: "black" | "white"): string {
  const folder = `${environment.assetsPath}/${color === "black" ? "icons-black" : "icons"}`;
  const iconPath = `${folder}/${name}.png`;
  return existsSync(iconPath) ? iconPath : `${folder}/${fallback}.png`;
}

export const getIconPathFromLight = (light: Light, color: "black" | "white") =>
  getIconPath(light.metadata.archetype, "question_mark", color);

// The icon pack has no icons for the downstairs, upstairs and top_floor archetypes, so they fall back to other.
export const getIconPathFromGroup = (group: Group, color: "black" | "white") =>
  getIconPath(`rooms/${group.metadata.archetype}`, "rooms/other", color);

export function getColorFromLight(light: Light): string {
  if (light.color_temperature?.mirek) {
    return miredToHexString(light.color_temperature.mirek, light.dimming?.brightness);
  }
  if (light.color?.xy) {
    return xyToRgbHexString(light.color.xy, light.dimming?.brightness);
  }
  return miredToHexString(MIRED_DEFAULT, light.dimming?.brightness);
}

// In color mode a light has no color temperature, so the temperature actions start from the white nearest its color,
// or from the middle of the light's range when the color is far from white.
export function getMiredFromLight({ color_temperature, color }: Light): number {
  if (!color_temperature) return MIRED_DEFAULT;
  const { mirek_minimum, mirek_maximum } = color_temperature.mirek_schema;
  return color_temperature.mirek ?? (color && xyToMired(color.xy)) ?? (mirek_minimum + mirek_maximum) / 2;
}

// Like the Hue app, palettes have one entry per color, not per light. Colors closer than ΔE 5 count as one, so lights a
// few mirek or percent apart do too, while 2200K and 2700K, or 100% and 50% brightness, stay apart.
const distinctColors = (colors: string[]) =>
  colors.reduce<string[]>(
    (kept, color) => (kept.some((k) => chroma.deltaE(k, color) < 5) ? kept : [...kept, color]),
    [],
  );

export const getColorsFromGroup = (lights: Light[], group: Group): Palette =>
  distinctColors(getLightsFromGroup(lights, group).map(getColorFromLight)).sort(
    (a, b) => chroma(b).get("hsl.h") - chroma(a).get("hsl.h"),
  );

export function getColorsFromScene({ palette, actions }: Scene): Palette {
  // Color sources in priority order
  const sources = [
    () => palette?.color.map(({ color, dimming }) => xyToRgbHexString(color.xy, dimming.brightness)),
    () =>
      actions.flatMap(({ action }) =>
        action.color ? [xyToRgbHexString(action.color.xy, action.dimming?.brightness)] : [],
      ),
    () =>
      palette?.color_temperature.map(({ color_temperature, dimming }) =>
        miredToHexString(color_temperature.mirek, dimming.brightness),
      ),
    () =>
      actions.flatMap(({ action }) =>
        action.color_temperature ? [miredToHexString(action.color_temperature.mirek, action.dimming?.brightness)] : [],
      ),
    () => palette?.dimming.map(({ brightness }) => miredToHexString(MIRED_DEFAULT, brightness)),
    () =>
      actions.flatMap(({ action }) =>
        action.dimming ? [miredToHexString(MIRED_DEFAULT, action.dimming.brightness)] : [],
      ),
  ];

  for (const source of sources) {
    const colors = distinctColors(source() ?? []);
    if (colors.length > 0) return colors;
  }
  return [];
}
