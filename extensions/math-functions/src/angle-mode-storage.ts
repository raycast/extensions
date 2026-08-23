import { LocalStorage } from "@raycast/api";
import { ANGLE_MODE_STORAGE_KEY, AngleMode, AngleModeState, createAngleModeState, getAngleMode } from "./angle-mode";

export async function readAngleMode(preference: AngleMode): Promise<AngleMode> {
  const state = await LocalStorage.getItem<string>(ANGLE_MODE_STORAGE_KEY);

  if (!state) {
    return preference;
  }

  try {
    return getAngleMode(JSON.parse(state) as AngleModeState, preference);
  } catch {
    return preference;
  }
}

export async function writeAngleMode(mode: AngleMode, preference: AngleMode): Promise<void> {
  await LocalStorage.setItem(ANGLE_MODE_STORAGE_KEY, JSON.stringify(createAngleModeState(mode, preference)));
}
