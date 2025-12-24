import { Group, Light, Palette, Scene } from "../lib/types";
import { miredToHexString, xyToRgbHexString } from "./colors";
import { MIRED_DEFAULT } from "./constants";
import { environment } from "@raycast/api";
import { existsSync } from "fs";

export function getLightsFromGroup(lights: Light[], group: Group): Light[] {
  return lights.filter((light) =>
    group.children.some((resource) => {
      return resource.rid === light.id || resource.rid === light.owner.rid;
    }),
  );
}

export function getIconPathFromLight(light: Light): string {
  const iconPath = `${environment.assetsPath}/icons/${light.metadata.archetype}.png`;

  if (existsSync(iconPath)) {
    return iconPath;
  } else {
    return `${environment.assetsPath}/icons/question_mark.png`;
  }
}

export function getColorFromLight(light: Light): string {
  if (light.color_temperature?.mirek) {
    return miredToHexString(light.color_temperature.mirek, light.dimming?.brightness);
  }
  if (light.color?.xy) {
    return xyToRgbHexString(light.color.xy, light.dimming?.brightness);
  }
  return miredToHexString(MIRED_DEFAULT, light.dimming?.brightness);
}

export function getColorsFromScene(scene: Scene): Palette {
  // Try each color source in priority order
  const colorExtractors = [
    // 1. Scene palette colors
    () => {
      const colors = scene.palette?.color;
      if (!colors || colors.length === 0) return null;
      const uniqueXY = new Set(colors.map((c) => c.color.xy));
      return colors
        .filter((c) => uniqueXY.has(c.color.xy))
        .map((c) => xyToRgbHexString(c.color.xy, c.color.dimming?.brightness));
    },
    // 2. Action colors
    () => {
      const actions = scene.actions?.filter((a) => a.action.color);
      if (!actions || actions.length === 0) return null;
      return actions.map((a) => {
        if (!a.action.color?.xy) throw new Error("action.action.color.xy is undefined");
        return xyToRgbHexString(a.action.color.xy, a.action.dimming?.brightness);
      });
    },
    // 3. Scene palette color temperatures
    () => {
      const temps = scene.palette?.color_temperature;
      if (!temps || temps.length === 0) return null;
      return temps.map((ct) => miredToHexString(ct.color_temperature.mirek, ct.dimming.brightness));
    },
    // 4. Action color temperatures
    () => {
      const actions = scene.actions?.filter((a) => a.action.color_temperature);
      if (!actions || actions.length === 0) return null;
      return actions.map((a) => {
        if (!a.action.color_temperature?.mirek) throw new Error("action.action.color_temperature.mirek is undefined");
        return miredToHexString(a.action.color_temperature.mirek, a.action.dimming?.brightness);
      });
    },
    // 5. Scene palette dimming
    () => {
      const dimmings = scene.palette?.dimming;
      if (!dimmings || dimmings.length === 0) return null;
      return dimmings.map((d) => miredToHexString(MIRED_DEFAULT, d.brightness));
    },
    // 6. Action dimming
    () => {
      const actions = scene.actions?.filter((a) => a.action.dimming);
      if (!actions || actions.length === 0) return null;
      return actions.map((a) => miredToHexString(MIRED_DEFAULT, a.action.dimming?.brightness));
    },
  ];

  for (const extractor of colorExtractors) {
    const colors = extractor();
    if (colors && colors.length > 0) return colors;
  }

  return [];
}
