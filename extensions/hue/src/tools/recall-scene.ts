import { checkBrightness, findScene, omitNull, withHueClient } from "../helpers/tools";

type Input = {
  /**
   * Name of the scene, as get-lights gives it
   */
  scene: string;
  /**
   * The scene's room or zone, needed when several have a scene with this name
   */
  group?: string;
  /**
   * Brightness in percent, 1 to 100, instead of the scene's own
   */
  brightness?: number;
};

/**
 * Set a Hue scene in its room or zone.
 */
export default async function tool(input: Input) {
  const { scene: name, group: groupName, brightness } = omitNull(input);
  if (brightness !== undefined) checkBrightness(brightness);
  return withHueClient(async (hueClient) => {
    const { scene, group } = findScene(await hueClient.getResources(), name, groupName);
    await hueClient.updateScene(scene, {
      recall: { action: "active", ...(brightness !== undefined && { dimming: { brightness } }) },
    });
    return `Set ${scene.metadata.name} in ${group}${brightness === undefined ? "" : ` at ${brightness}%`}.`;
  });
}
