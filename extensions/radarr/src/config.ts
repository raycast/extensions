import { getPreferenceValues } from "@raycast/api";
import type { RadarrInstance } from "./types";

interface Preferences {
  primaryInstanceName: string;
  primaryInstanceUrl: string;
  primaryInstanceApiKey: string;
  enableSecondaryInstance?: boolean;
  secondaryInstanceName?: string;
  secondaryInstanceUrl?: string;
  secondaryInstanceApiKey?: string;
  activeInstance?: "primary" | "secondary";
}

export function getRadarrInstances(): RadarrInstance[] {
  const preferences = getPreferenceValues<Preferences>();
  const instances: RadarrInstance[] = [];

  // Primary instance (always present)
  if (!preferences.primaryInstanceName || !preferences.primaryInstanceUrl || !preferences.primaryInstanceApiKey) {
    throw new Error("Primary Radarr instance configuration is incomplete");
  }

  instances.push({
    name: preferences.primaryInstanceName,
    url: preferences.primaryInstanceUrl.replace(/\/$/, ""), // Remove trailing slash
    apiKey: preferences.primaryInstanceApiKey,
    isDefault: true,
  });

  // Secondary instance (optional)
  if (
    preferences.enableSecondaryInstance &&
    preferences.secondaryInstanceName &&
    preferences.secondaryInstanceUrl &&
    preferences.secondaryInstanceApiKey
  ) {
    instances.push({
      name: preferences.secondaryInstanceName,
      url: preferences.secondaryInstanceUrl.replace(/\/$/, ""), // Remove trailing slash
      apiKey: preferences.secondaryInstanceApiKey,
      isDefault: false,
    });
  }

  return instances;
}

export function getActiveRadarrInstance(): RadarrInstance {
  const preferences = getPreferenceValues<Preferences>();
  const instances = getRadarrInstances();

  // If secondary instance is enabled and selected, use it
  if (preferences.activeInstance === "secondary" && preferences.enableSecondaryInstance && instances.length > 1) {
    return instances[1]; // Secondary instance
  }

  // Otherwise use primary instance
  if (instances.length > 0) {
    return instances[0]; // Primary instance
  }

  throw new Error("No Radarr instances configured");
}

export function getDefaultRadarrInstance(): RadarrInstance {
  // Keep for backward compatibility, but use active instance logic
  return getActiveRadarrInstance();
}

export function validateRadarrInstance(instance: RadarrInstance): void {
  if (!instance.name.trim()) {
    throw new Error("Instance name cannot be empty");
  }

  if (!instance.url.trim()) {
    throw new Error("Instance URL cannot be empty");
  }

  if (!instance.apiKey.trim()) {
    throw new Error("Instance API key cannot be empty");
  }

  try {
    new URL(instance.url);
  } catch {
    throw new Error("Instance URL is not valid");
  }
}

export function getRadarrInstanceChoices(): Array<{ title: string; value: string }> {
  const instances = getRadarrInstances();

  return instances.map(instance => ({
    title: `${instance.name} (${instance.url})`,
    value: JSON.stringify({
      name: instance.name,
      url: instance.url,
      apiKey: instance.apiKey,
      isDefault: instance.isDefault,
    }),
  }));
}
