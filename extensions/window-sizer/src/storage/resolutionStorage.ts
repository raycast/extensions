import { LocalStorage } from "@raycast/api";
import { Resolution } from "../types";
import { isSameResolution } from "../utils/resolution";

const CUSTOM_RESOLUTIONS_KEY = "custom-resolutions";
const STARRED_RESOLUTIONS_KEY = "starred-resolutions";

export type DuplicateResolutionSource = "custom" | "preset";

export class DuplicateResolutionError extends Error {
  constructor(readonly source: DuplicateResolutionSource) {
    super(`Resolution already exists in ${source} sizes`);
    this.name = "DuplicateResolutionError";
  }
}

export async function getCustomResolutions(): Promise<Resolution[]> {
  return getResolutions(CUSTOM_RESOLUTIONS_KEY);
}

export async function getStarredResolutions(): Promise<Resolution[]> {
  return getResolutions(STARRED_RESOLUTIONS_KEY);
}

export async function setCustomResolutions(resolutions: Resolution[]): Promise<void> {
  await setResolutions(CUSTOM_RESOLUTIONS_KEY, resolutions);
}

export async function setStarredResolutions(resolutions: Resolution[]): Promise<void> {
  await setResolutions(STARRED_RESOLUTIONS_KEY, resolutions);
}

export async function saveCustomResolution(
  nextResolution: Resolution,
  previousResolution: Resolution | undefined,
  presetResolutions: Resolution[],
): Promise<void> {
  const [storedCustomResolutions, storedStarredResolutions] = await Promise.all([
    LocalStorage.getItem<string>(CUSTOM_RESOLUTIONS_KEY),
    LocalStorage.getItem<string>(STARRED_RESOLUTIONS_KEY),
  ]);
  const customResolutions = parseResolutions(storedCustomResolutions);
  const starredResolutions = parseResolutions(storedStarredResolutions);

  const existsInCustom = customResolutions.some(
    (resolution) =>
      (!previousResolution || !isSameResolution(resolution, previousResolution)) &&
      isSameResolution(resolution, nextResolution),
  );
  if (existsInCustom) {
    throw new DuplicateResolutionError("custom");
  }

  if (presetResolutions.some((resolution) => isSameResolution(resolution, nextResolution))) {
    throw new DuplicateResolutionError("preset");
  }

  const updatedCustomResolutions = [...customResolutions];
  if (previousResolution) {
    const customIndex = customResolutions.findIndex((resolution) => isSameResolution(resolution, previousResolution));
    if (customIndex === -1) {
      throw new Error("Custom size no longer exists");
    }
    updatedCustomResolutions[customIndex] = nextResolution;
  } else {
    updatedCustomResolutions.push(nextResolution);
  }

  const starredIndex = previousResolution
    ? starredResolutions.findIndex((resolution) => isSameResolution(resolution, previousResolution))
    : -1;
  const updatedStarredResolutions = [...starredResolutions];
  if (starredIndex >= 0) {
    updatedStarredResolutions[starredIndex] = { ...nextResolution, isStarred: true };
  }

  await setCustomResolutions(updatedCustomResolutions);
  try {
    if (starredIndex >= 0) {
      await setStarredResolutions(updatedStarredResolutions);
    }
  } catch (error) {
    await restoreResolutions(CUSTOM_RESOLUTIONS_KEY, storedCustomResolutions);
    throw error;
  }
}

async function getResolutions(key: string): Promise<Resolution[]> {
  return parseResolutions(await LocalStorage.getItem<string>(key));
}

function parseResolutions(storedResolutions: string | undefined): Resolution[] {
  return storedResolutions ? JSON.parse(storedResolutions) : [];
}

async function setResolutions(key: string, resolutions: Resolution[]): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(resolutions));
}

async function restoreResolutions(key: string, storedResolutions: string | undefined): Promise<void> {
  if (storedResolutions === undefined) {
    await LocalStorage.removeItem(key);
    return;
  }

  await LocalStorage.setItem(key, storedResolutions);
}
