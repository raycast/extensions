import {
  RIGHT_CLICK_LABELS,
  RightClickMode,
  setLevel,
  setRightClickMode,
  stepSetting,
  toggleBoolSetting,
} from "./trackpad";
import { confirmChange, reportError } from "./feedback";

/** Shared logic for the one-shot toggle commands. */
export async function quickToggle(id: string) {
  try {
    const { title, on, applied } = await toggleBoolSetting(id);
    await confirmChange(`${title}: ${on ? "On" : "Off"}`, applied, true);
  } catch (e) {
    await reportError(e, true);
  }
}

/** Shared logic for the one-shot speed commands. */
export async function quickStep(id: string, direction: 1 | -1, label: string) {
  try {
    const { position, applied } = await stepSetting(id, direction);
    await confirmChange(`${label}: ${position}`, applied, true);
  } catch (e) {
    await reportError(e, true);
  }
}

/** Shared logic for the "Set … Speed" commands with a level argument. */
export async function quickSetLevel(id: string, level: string | undefined, label: string) {
  try {
    const n = Number(level);
    if (!Number.isFinite(n)) throw new Error("Pick a speed from 1 to 10");
    const { position, applied } = await setLevel(id, n);
    await confirmChange(`${label}: ${position}`, applied, true);
  } catch (e) {
    await reportError(e, true);
  }
}

/** Shared logic for the fixed secondary click commands. */
export async function setRightClick(mode: RightClickMode) {
  try {
    const applied = await setRightClickMode(mode);
    await confirmChange(`Secondary Click: ${RIGHT_CLICK_LABELS[mode]}`, applied, true);
  } catch (e) {
    await reportError(e, true);
  }
}
