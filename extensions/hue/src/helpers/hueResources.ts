import { Group, Light, Palette, Scene } from "../lib/types";
import { miredToHexString, xyToRgbHexString } from "./colors";
import { MIRED_DEFAULT } from "./constants";
import { Image } from "@raycast/api";

export function getLightsFromGroup(lights: Light[], group: Group): Light[] {
  return lights.filter((light) =>
    group.children.some((resource) => {
      return resource.rid === light.id || resource.rid === light.owner.rid;
    })
  );
}

export function getLightIcon(light: Light): Image {
  const color = getColorFromLight(light);

  return {
    source: `icons/${light.metadata.archetype}.png`,
    tintColor: light.on.on ? color : "gray",
  };
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
  const paletteColors = [
    ...(scene.palette?.color?.map((color) => {
      return xyToRgbHexString(color.color.xy, color.color.dimming?.brightness);
    }) || []),
    ...(scene.palette?.color_temperature?.map((color_temperature) => {
      return miredToHexString(color_temperature.color_temperature.mirek, color_temperature.dimming.brightness);
    }) || []),
    ...(scene.palette?.dimming?.map((dimming) => {
      return miredToHexString(MIRED_DEFAULT, dimming.brightness);
    }) || []),
  ];

  const actionColors =
    scene.actions
      ?.filter((action) => action.action.color || action.action.color_temperature || action.action.dimming)
      .map((action) => {
        if (action.action.color_temperature?.mirek) {
          return miredToHexString(action.action.color_temperature.mirek, action.action.dimming?.brightness);
        }
        if (action.action.color?.xy) {
          return xyToRgbHexString(action.action.color.xy, action.action.dimming?.brightness);
        }
        return miredToHexString(MIRED_DEFAULT, action.action.dimming?.brightness);
      }) || [];

  return paletteColors.length > 0 ? paletteColors : actionColors;
}
