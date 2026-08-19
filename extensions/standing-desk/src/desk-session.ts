import { cancelActiveMovement } from "./native";
import {
  DeskSettings,
  forgetDeskIdentifier,
  restoreDefaultSettings,
  saveSettings,
  selectDeskIdentifier,
} from "./storage";

async function mutateDeskSession<T>(mutation: () => Promise<T>): Promise<T> {
  await cancelActiveMovement();
  try {
    return await mutation();
  } finally {
    await cancelActiveMovement();
  }
}

export function saveDeskSession(
  settings: DeskSettings,
  identifier: string,
): Promise<void> {
  return mutateDeskSession(async () => {
    await forgetDeskIdentifier();
    await saveSettings(settings);
    await selectDeskIdentifier(identifier);
  });
}

export function restoreDefaultDeskSession(): Promise<DeskSettings> {
  return mutateDeskSession(restoreDefaultSettings);
}

export function forgetDeskSession(): Promise<void> {
  return mutateDeskSession(forgetDeskIdentifier);
}
