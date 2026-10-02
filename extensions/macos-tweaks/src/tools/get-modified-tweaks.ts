import { ALL_TWEAKS } from "../tweaks";
import { CATEGORY_META } from "../types";
import { getAllTweakStates } from "../utils/defaults";
import { formatDefault, formatValue } from "../utils/format";

/**
 * List every macOS setting that currently differs from its system default, so the user can be
 * told what they have changed and offered a way back.
 */
export default async function getModifiedTweaks() {
  const states = await getAllTweakStates(ALL_TWEAKS);
  const modified = states.filter((t) => t.isModified);

  return {
    count: modified.length,
    tweaks: modified.map((tweak) => ({
      id: tweak.id,
      title: tweak.title,
      category: CATEGORY_META[tweak.category].title,
      currentValue: formatValue(tweak),
      defaultValue: formatDefault(tweak),
      domain: tweak.domain,
      key: tweak.key,
    })),
  };
}
