import { Tool } from "@raycast/api";
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

/** Resolves the space name, and rejects a window ID that no longer matches an open window. */
async function resolveTarget(input: Input) {
  const spaces = await readSpacesForTool();
  const space = findSpaceName(spaces.names, input.space);
  if (input.windowId && !(input.windowId in spaces.activeByWindow)) {
    throw new Error(
      `No open Dia window has the ID "${input.windowId}". It may have been closed. Nothing was switched. Call get-spaces for the current window IDs, or omit windowId to switch the front window.`,
    );
  }
  return { space, windowId: input.windowId, currentSpace: input.windowId && spaces.activeByWindow[input.windowId] };
}

/**
 * Switches a Dia window to another space, like picking it in Dia's sidebar, and brings Dia to the front.
 *
 * Only for requests to go to, show or switch to a space. Don't call it when the user asks to create, rename,
 * delete or reorder a space: this can't be done from Raycast, and switching to the space first doesn't help.
 * Tell the user to do it in Dia instead.
 */
export default async function tool(input: Input) {
  const { space, windowId } = await resolveTarget(input);
  // Without a window ID, focusSpace switches the front window
  await focusSpace(space, windowId ?? "").catch((error) => {
    throw toAutomationError(error);
  });
  return { switchedTo: space, windowId };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Throw rather than skip the dialog: a target that can't be resolved must not be switched
  const { space, windowId, currentSpace } = await resolveTarget(input);
  return {
    message: `Switch ${windowId ? "the Dia window" : "the front Dia window"} to the ${space} space?`,
    info: [{ name: "Space", value: space }, ...(currentSpace ? [{ name: "Current Space", value: currentSpace }] : [])],
  };
};
