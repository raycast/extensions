import { LocalStorage, getPreferenceValues } from "@raycast/api";
import type { StripeProfile, Environment } from "@src/types";

const STORAGE_KEY = "stripe-profiles";
const ACTIVE_PROFILE_KEY = "stripe-active-profile-id";
const ACTIVE_ENVIRONMENT_KEY = "stripe-active-environment";

export const getStoredProfiles = async (): Promise<StripeProfile[]> => {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveProfiles = async (profiles: StripeProfile[]): Promise<void> => {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
};

export const getActiveProfileId = async (): Promise<string | null> => {
  return (await LocalStorage.getItem<string>(ACTIVE_PROFILE_KEY)) || null;
};

export const saveActiveProfileId = async (profileId: string): Promise<void> => {
  await LocalStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
};

export const getActiveEnvironment = async (): Promise<Environment> => {
  const env = await LocalStorage.getItem<string>(ACTIVE_ENVIRONMENT_KEY);
  return env === "test" ? "test" : "live";
};

export const saveActiveEnvironment = async (environment: Environment): Promise<void> => {
  await LocalStorage.setItem(ACTIVE_ENVIRONMENT_KEY, environment);
};

export const generateProfileId = (): string => {
  return `profile-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const getDefaultProfileFromPreferences = (): StripeProfile => {
  const { stripeTestApiKey, stripeLiveApiKey } = getPreferenceValues<{
    stripeTestApiKey?: string;
    stripeLiveApiKey?: string;
  }>();

  return {
    id: "default",
    name: "Default Account",
    testApiKey: stripeTestApiKey,
    liveApiKey: stripeLiveApiKey,
    isDefault: true,
    color: "#635BFF",
  };
};

export const initializeProfiles = async (): Promise<{
  profiles: StripeProfile[];
  activeProfileId: string | null;
}> => {
  let profiles = await getStoredProfiles();
  const defaultProfile = getDefaultProfileFromPreferences();

  if (profiles.length === 0) {
    profiles = [defaultProfile];
  } else {
    const defaultIndex = profiles.findIndex((p) => p.id === "default" || p.isDefault);
    if (defaultIndex >= 0) {
      profiles[defaultIndex] = { ...profiles[defaultIndex], ...defaultProfile };
    }
  }

  await saveProfiles(profiles);

  let activeProfileId = await getActiveProfileId();
  if (!activeProfileId) {
    activeProfileId = profiles[0].id;
    await saveActiveProfileId(activeProfileId);
  }

  return { profiles, activeProfileId };
};

export const validateProfile = (profile: StripeProfile, environment: Environment): boolean => {
  return environment === "test" ? !!profile.testApiKey : !!profile.liveApiKey;
};

/**
 * Get the current active profile configuration.
 *
 * This centralized function handles:
 * - Fetching all profiles from storage
 * - Getting the active profile ID
 * - Getting the active environment (defaults to "live")
 * - Finding and returning the active profile
 *
 * @returns Object containing profiles, activeProfile, activeProfileId, and activeEnvironment
 */
export const getActiveProfileConfig = async (): Promise<{
  profiles: StripeProfile[];
  activeProfile: StripeProfile | null;
  activeProfileId: string | null;
  activeEnvironment: Environment;
}> => {
  const profiles = await getStoredProfiles();
  const activeProfileId = await getActiveProfileId();
  const activeEnvironment = await getActiveEnvironment();

  // Find the active profile, or use the first one if none is set
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;

  return {
    profiles,
    activeProfile,
    activeProfileId: activeProfile?.id || activeProfileId,
    activeEnvironment,
  };
};
