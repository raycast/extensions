import { Action, Tool } from "@raycast/api";
import { ALL_TWEAKS } from "../tweaks";
import { CATEGORY_META } from "../types";
import type { TweakValue } from "../types";
import { applyTweak, getCommandString, getTweakStateAsync } from "../utils/defaults";
import { formatValue } from "../utils/format";

type Input = {
  /** The id of the tweak to change, exactly as returned by the search-tweaks tool. */
  id: string;
  /**
   * The value to set, as a string. For a boolean tweak pass "true" or "false"; for an enum tweak
   * pass one of the values listed in its `options`; for a number tweak pass the number, e.g. "52".
   */
  value: string;
};

/** The AI hands values over as strings, so they are coerced to the type the tweak declares. */
function coerce(id: string, raw: string): TweakValue {
  const tweak = find(id);
  if (tweak.type === "boolean") {
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
    throw new Error(`"${tweak.title}" is a switch: pass "true" or "false", not "${raw}".`);
  }
  // only a free-form number tweak takes any number; a numeric enum falls through to the
  // options check below, so a value it never declared cannot be written
  if (tweak.type === "number") {
    const n = Number(raw);
    if (Number.isNaN(n)) throw new Error(`"${tweak.title}" takes a number, but got "${raw}".`);
    return n;
  }
  if (tweak.type === "enum" && tweak.options) {
    const match = tweak.options.find((o) => String(o.value) === raw || o.title.toLowerCase() === raw.toLowerCase());
    if (!match) {
      const allowed = tweak.options.map((o) => String(o.value)).join(", ");
      throw new Error(`"${raw}" is not a valid value for "${tweak.title}". Allowed: ${allowed}.`);
    }
    return match.value;
  }
  return raw;
}

function find(id: string) {
  const tweak = ALL_TWEAKS.find((t) => t.id === id);
  if (!tweak) throw new Error(`No tweak with id "${id}". Use search-tweaks to find the right id.`);
  return tweak;
}

/**
 * Change a macOS setting. Writing a value here edits the user's real system preferences, so the
 * change is shown for confirmation first.
 */
export default async function applyTweakTool({ id, value }: Input) {
  const tweak = find(id);
  const coerced = coerce(id, value);
  applyTweak(tweak, coerced);
  const state = await getTweakStateAsync(tweak);

  return {
    title: tweak.title,
    newValue: formatValue(state),
    restarted: tweak.requiresRestart ?? null,
    command: getCommandString(tweak, coerced),
  };
}

export const confirmation: Tool.Confirmation<Input> = async ({ id, value }) => {
  const tweak = find(id);
  const state = await getTweakStateAsync(tweak);

  return {
    style: tweak.risk === "moderate" ? Action.Style.Destructive : Action.Style.Regular,
    message: `Change the macOS setting "${tweak.title}"?`,
    info: [
      { name: "Category", value: CATEGORY_META[tweak.category].title },
      { name: "Current value", value: formatValue(state) },
      // formatted the same way as the current value, so "On" is compared with "Off" and not with "false"
      { name: "New value", value: formatValue({ ...state, currentValue: coerce(id, value) }) },
      { name: "Command", value: getCommandString(tweak, coerce(id, value)) },
      ...(tweak.requiresRestart ? [{ name: "Restarts", value: tweak.requiresRestart }] : []),
    ],
  };
};
