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
  const containsSceneColor = scene.palette?.color?.length ?? 0 > 0;
  const uniqueSceneColors = new Set(scene.palette?.color?.map((color) => color.color.xy) ?? []);
  const sceneColors =
    scene.palette?.color
      ?.filter((color) => uniqueSceneColors.has(color.color.xy))
      ?.map((color) => {
        return xyToRgbHexString(color.color.xy, color.color.dimming?.brightness);
      }) ?? [];
  if (containsSceneColor) return sceneColors;

  const containsActionColors = scene.actions?.some((action) => action.action.color) ?? false;
  const actionColors =
    scene.actions
      ?.filter((action) => action.action.color)
      .map((action) => {
        if (action.action.color?.xy === undefined) throw new Error("action.action.color.xy is undefined");
        return xyToRgbHexString(action.action.color.xy, action.action.dimming?.brightness);
      }) || [];
  if (containsActionColors) return actionColors;

  const containsSceneTemperatures = scene.palette?.color_temperature?.length ?? 0 > 0;
  const sceneTemperatures =
    scene.palette?.color_temperature?.map((color_temperature) => {
      return miredToHexString(color_temperature.color_temperature.mirek, color_temperature.dimming.brightness);
    }) ?? [];
  if (containsSceneTemperatures) return sceneTemperatures;

  const containsActionTemperatures = scene.actions?.some((action) => action.action.color_temperature) ?? false;
  const actionTemperatures =
    scene.actions
      ?.filter((action) => action.action.color_temperature)
      .map((action) => {
        if (action.action.color_temperature?.mirek === undefined)
          throw new Error("action.action.color_temperature.mirek is undefined");
        return miredToHexString(action.action.color_temperature.mirek, action.action.dimming?.brightness);
      }) || [];
  if (containsActionTemperatures) return actionTemperatures;

  const containsSceneDimmings = scene.palette?.dimming?.length ?? 0 > 0;
  const sceneDimmings =
    scene.palette?.dimming?.map((dimming) => {
      return miredToHexString(MIRED_DEFAULT, dimming.brightness);
    }) ?? [];
  if (containsSceneDimmings) return sceneDimmings;

  const containsActionDimmings = scene.actions?.some((action) => action.action.dimming) ?? false;
  const actionDimmings = scene.actions
    .filter((action) => action.action.dimming)
    .map((action) => {
      return miredToHexString(MIRED_DEFAULT, action.action.dimming?.brightness);
    });
  if (containsActionDimmings) return actionDimmings;

  return [];
}
