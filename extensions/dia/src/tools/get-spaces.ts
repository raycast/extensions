import { getProfileColors } from "../profiles";
import { readSpacesForTool } from "../spaces";

/**
 * Returns the Dia spaces in Dia's sidebar order, with each space's color and whether a window is showing it.
 * Use it before switch-space, or to answer which spaces exist and which one is active.
 */
export default async function tool() {
  const [spaces, colors] = await Promise.all([readSpacesForTool(), getProfileColors().catch(() => undefined)]);
  const windowsBySpace = new Map<string, string[]>();
  for (const [windowId, name] of Object.entries(spaces.activeByWindow)) {
    windowsBySpace.set(name, [...(windowsBySpace.get(name) ?? []), windowId]);
  }
  return spaces.names.map((name) => ({
    name,
    color: colors?.[name],
    isActive: windowsBySpace.has(name),
    /** IDs of the windows showing this space. */
    windowIds: windowsBySpace.get(name) ?? [],
  }));
}
