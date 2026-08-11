import { LocalStorage, getPreferenceValues } from "@raycast/api";
import {
  listInputSources,
  currentInputSource,
  selectInputSource,
  cycleInputSource,
  convertText,
  readFocusedField,
  selectAllInFocusedField,
} from "swift:../../swift";

export const SLOTS = [1, 2, 3, 4] as const;
export type Slot = (typeof SLOTS)[number];

export type InputSource = {
  id: string;
  name: string;
  isCurrent: boolean;
};

export const listSources = listInputSources as () => Promise<InputSource[]>;
export const currentSource = currentInputSource as () => Promise<InputSource>;
export const selectSource = selectInputSource as (
  id: string,
) => Promise<InputSource>;
export const cycleSource = cycleInputSource as () => Promise<InputSource>;

export type Conversion = {
  layoutId: string;
  layoutName: string;
  text: string;
};

export type ConversionSet = {
  detectedSourceId: string;
  detectedSourceName: string;
  conversions: Conversion[];
};

/**
 * Rewrites text as if the same physical keys had been pressed under each enabled
 * layout, and reports which layout it thinks the text was typed with. One call
 * covers every layout so a preview list needs a single round trip.
 */
export const convertToLayouts = convertText as (
  text: string,
) => Promise<ConversionSet>;

export type FocusedField = {
  text: string;
  appName: string;
};

/** Whole contents of the focused text field, used when nothing is selected. */
export const readField = readFocusedField as () => Promise<FocusedField>;

/** Selects everything in the focused field so the next paste replaces it. */
export const selectAllInField = selectAllInFocusedField as () => Promise<void>;

/**
 * Slot assignments live in LocalStorage rather than in preferences because a
 * Raycast dropdown preference needs its options hardcoded in package.json,
 * which cannot describe the input sources enabled on someone else's Mac. The
 * "Configure Layout Slots" command uses a Form.Dropdown instead — those are
 * populated at runtime.
 */
const slotKey = (slot: Slot) => `slot-${slot}`;

export async function getSlot(slot: Slot) {
  return await LocalStorage.getItem<string>(slotKey(slot));
}

export async function setSlot(slot: Slot, id: string) {
  if (id) {
    await LocalStorage.setItem(slotKey(slot), id);
  } else {
    await LocalStorage.removeItem(slotKey(slot));
  }
}

/**
 * Writes slot assignments one at a time. Concurrent LocalStorage writes are not
 * atomic against each other and silently lose values, so do not reach for
 * Promise.all here.
 */
export async function setSlots(assignments: Map<Slot, string>) {
  for (const slot of SLOTS) {
    await setSlot(slot, assignments.get(slot) ?? "");
  }
}

export async function getSlots() {
  const ids = await Promise.all(SLOTS.map(getSlot));
  return new Map(SLOTS.map((slot, index) => [slot, ids[index]]));
}

/**
 * Slots that have never been configured fall back to the nth enabled input
 * source, so hotkeys do something sensible before the extension is set up.
 */
export async function resolveSlot(slot: Slot) {
  const slots = await getSlots();
  const stored = slots.get(slot);
  if (stored) return stored;

  // Only fall back when nothing has ever been configured, so a slot deliberately
  // left as Not Assigned stays inert instead of quietly switching to the nth
  // enabled layout.
  if (SLOTS.some((candidate) => slots.get(candidate))) return undefined;

  const sources = await listSources();
  return sources[slot - 1]?.id;
}

// Typed with the generated Preferences rather than a hand-written shape, so
// renaming a preference in package.json breaks the build here instead of
// silently reading undefined.
export function shouldShowHud() {
  return getPreferenceValues<Preferences>().showHud;
}

export function shouldSwitchAfterConvert() {
  return getPreferenceValues<Preferences>().switchAfterConvert;
}

export function shouldFallBackToWholeField() {
  return getPreferenceValues<Preferences>().whenNothingSelected !== "nothing";
}
