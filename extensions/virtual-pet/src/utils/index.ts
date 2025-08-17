import { PetState } from "../types";

export * from "./actions";
export * from "./status";

export const getPetImagePath = (petState: PetState): string => {
  return petState.isSleeping ? `pets/${petState.pet.key}/sleep.gif` : `pets/${petState.pet.key}/idle.gif`;
};

export const getSleepTimeRemaining = (petState: PetState): number => {
  const { isSleeping, sleepUntil } = petState;
  return isSleeping && sleepUntil ? Math.max(0, Math.floor((sleepUntil - Date.now()) / (1000 * 60))) : 0;
};

export function formatTime(timestamp: number): string {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
}
