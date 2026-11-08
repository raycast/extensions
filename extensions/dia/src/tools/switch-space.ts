import { focusSpace } from "../dia";
import { toAutomationError } from "../find-tab";
import { findSpaceName, readSpacesForTool } from "../spaces";

type Input = {
  /**
   * Name of the Dia space to switch to, e.g. "Work" (case-insensitive).
   *
   * @remarks
   * Take it from get-spaces or a tab's space.
   */
  space: string;

  /**
   * ID of the Dia window to switch, from get-spaces or get-tabs.
   *
   * @remarks
   * Omit it to switch the front window.
   */
  windowId?: string;
};

/**
 * Switches a Dia window to another space, like picking it in Dia's sidebar, and brings Dia to the front.
 */
export default async function tool(input: Input) {
  const spaces = await readSpacesForTool();
  const space = findSpaceName(spaces.names, input.space);
  // focusSpace falls back to the front window when the window ID doesn't match one
  await focusSpace(space, input.windowId ?? "").catch((error) => {
    throw toAutomationError(error);
  });
  return { switchedTo: space };
}
