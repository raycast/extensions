import { Tool } from "@raycast/api";
import { toggleSpaceEnabled, updateSpaceCustomName } from "../Config";
import { loadCraftSnapshot } from "../lib/aiTools";
import { canToggleSpaceEnabled } from "../lib/manageSpaces";

type Input = {
  /** ID of the space to change (from list-spaces). */
  spaceId: string;
  /** New display name for the space. Use an empty string to clear the custom name. Omit to keep it. */
  name?: string;
  /** Whether the space is enabled in this extension. Omit to keep it. */
  enabled?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Update this Craft space?",
  info: [
    { name: "Space", value: input.spaceId },
    { name: "Name", value: input.name },
    { name: "Enabled", value: input.enabled === undefined ? undefined : String(input.enabled) },
  ],
});

/** Rename a Craft space or enable/disable it in this extension. The primary space cannot be disabled. */
export default async function (input: Input) {
  let { snapshot } = await loadCraftSnapshot();
  const space = snapshot.spaces.find((entry) => entry.spaceID === input.spaceId);

  if (!space) {
    throw new Error(`Unknown Craft space "${input.spaceId}". Use list-spaces to get valid space IDs.`);
  }

  const shouldToggle = input.enabled !== undefined && input.enabled !== space.isEnabled;

  // Validate before saving anything so a rejected toggle doesn't leave a half-applied rename.
  if (shouldToggle && !canToggleSpaceEnabled({ space, currentlyEnabled: space.isEnabled })) {
    throw new Error("The primary space cannot be disabled.");
  }

  if (input.name !== undefined) {
    snapshot = updateSpaceCustomName(snapshot, space.spaceID, input.name.trim() || null);
  }

  if (shouldToggle) {
    snapshot = toggleSpaceEnabled(snapshot, space.spaceID);
  }

  return "Space updated.";
}
