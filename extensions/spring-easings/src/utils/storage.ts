import { LocalStorage } from "@raycast/api";
import { SpringEasing } from "../models/easings";

const CUSTOM_EASINGS_KEY = "custom-easings";

export async function getCustomEasings(): Promise<SpringEasing[]> {
  const storedEasings = await LocalStorage.getItem<string>(CUSTOM_EASINGS_KEY);
  if (!storedEasings) {
    return [];
  }

  try {
    return JSON.parse(storedEasings) as SpringEasing[];
  } catch (error) {
    console.error("Failed to parse custom easings:", error);
    return [];
  }
}

export async function saveCustomEasing(easing: SpringEasing): Promise<void> {
  const existingEasings = await getCustomEasings();

  // Check if easing with same name already exists
  const index = existingEasings.findIndex((e) => e.name === easing.name);

  if (index >= 0) {
    // Replace existing easing
    existingEasings[index] = easing;
  } else {
    // Add new easing
    existingEasings.push(easing);
  }

  await LocalStorage.setItem(CUSTOM_EASINGS_KEY, JSON.stringify(existingEasings));
}

export async function removeCustomEasing(name: string): Promise<void> {
  const existingEasings = await getCustomEasings();
  const filteredEasings = existingEasings.filter((e) => e.name !== name);
  await LocalStorage.setItem(CUSTOM_EASINGS_KEY, JSON.stringify(filteredEasings));
}
