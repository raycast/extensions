import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { StripeProfile } from "@src/types";

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

export const getActiveEnvironment = async (): Promise<"live" | "test"> => {
  const env = await LocalStorage.getItem<string>(ACTIVE_ENVIRONMENT_KEY);
  return (env === "test" ? "test" : "live") as "live" | "test";
};

export const saveActiveEnvironment = async (environment: "live" | "test"): Promise<void> => {
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

export const validateProfile = (profile: StripeProfile, environment: "test" | "live"): boolean => {
  return environment === "test" ? !!profile.testApiKey : !!profile.liveApiKey;
};
