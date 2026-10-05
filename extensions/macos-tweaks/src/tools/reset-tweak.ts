import { Action, Tool } from "@raycast/api";
import { ALL_TWEAKS } from "../tweaks";
import { CATEGORY_META } from "../types";
import { getResetCommandString, getTweakStateAsync, resetTweak } from "../utils/defaults";
import { formatDefault, formatValue } from "../utils/format";

type Input = {
  /** The id of the tweak to put back to its macOS default, as returned by the search-tweaks tool. */
  id: string;
};

function find(id: string) {
  const tweak = ALL_TWEAKS.find((t) => t.id === id);
  if (!tweak) throw new Error(`No tweak with id "${id}". Use search-tweaks to find the right id.`);
  return tweak;
}

/** Put a macOS setting back to its system default, discarding the user's current value. */
export default async function resetTweakTool({ id }: Input) {
  const tweak = find(id);
  resetTweak(tweak);
  const state = await getTweakStateAsync(tweak);

  return {
    title: tweak.title,
    value: formatValue(state),
    restarted: tweak.requiresRestart ?? null,
  };
}

export const confirmation: Tool.Confirmation<Input> = async ({ id }) => {
  const tweak = find(id);
  const state = await getTweakStateAsync(tweak);

  // nothing to undo, so nothing to confirm
  if (!state.isModified) return undefined;

  return {
    style: Action.Style.Destructive,
    message: `Reset "${tweak.title}" to its macOS default?`,
    info: [
      { name: "Category", value: CATEGORY_META[tweak.category].title },
      { name: "Current value", value: formatValue(state) },
      { name: "Will become", value: formatDefault(state) },
      { name: "Command", value: getResetCommandString(tweak) },
      ...(tweak.requiresRestart ? [{ name: "Restarts", value: tweak.requiresRestart }] : []),
    ],
  };
};
