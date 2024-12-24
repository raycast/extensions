import { LocalStorage } from "@raycast/api";
import { Bundle } from "../types";

const STORAGE_KEYS = {
  PROFILES: "link-bundles-profiles",
  BUNDLES: "link-bundles",
} as const;

interface ChromeProfileData {
  bundleTitle: string;
  profile: string;
}

// Load Chrome profiles from separate file
const loadChromeProfiles = async (): Promise<Record<string, string>> => {
  try {
    const data = await LocalStorage.getItem<string>(STORAGE_KEYS.PROFILES);
    const profiles: ChromeProfileData[] = JSON.parse(data ?? "[]");
    return profiles.reduce(
      (acc, { bundleTitle, profile }) => ({
        ...acc,
        [bundleTitle]: profile,
      }),
      {},
    );
  } catch (error) {
    console.error("Failed to load Chrome profiles:", error);
    return {};
  }
};

// Save Chrome profiles to separate file
const saveChromeProfiles = async (bundles: Bundle[]): Promise<void> => {
  try {
    const profileData: ChromeProfileData[] = bundles
      .filter((bundle) => bundle.chromeProfile)
      .map((bundle) => ({
        bundleTitle: bundle.title,
        profile: bundle.chromeProfile || "Default",
      }));
    await LocalStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profileData));
  } catch (error) {
    console.error("Failed to save Chrome profiles:", error);
  }
};

export const loadBundles = async (): Promise<Bundle[]> => {
  try {
    const data = await LocalStorage.getItem<string>(STORAGE_KEYS.BUNDLES);
    const loadedBundles: Bundle[] = JSON.parse(data ?? "[]");
    const chromeProfiles = await loadChromeProfiles();
    return loadedBundles.map((bundle: Bundle) => ({
      ...bundle,
      chromeProfile: chromeProfiles[bundle.title] || "Default",
    }));
  } catch (error) {
    console.error("Failed to load bundles:", error);
    return [];
  }
};

export const saveBundles = async (bundles: Bundle[]): Promise<void> => {
  try {
    // Save bundles without chrome profile information
    const bundlesWithoutProfiles = bundles.map(({ ...bundle }) => bundle);
    await LocalStorage.setItem(STORAGE_KEYS.BUNDLES, JSON.stringify(bundlesWithoutProfiles));

    // Save chrome profiles separately
    await saveChromeProfiles(bundles);
  } catch (error) {
    console.error("Failed to save bundles:", error);
  }
};

// Utility function to get Chrome profile for a specific bundle title
export const getChromeProfile = async (bundleTitle: string): Promise<string> => {
  const profiles = await loadChromeProfiles();
  return profiles[bundleTitle] || "Default";
};

// Utility function to update Chrome profile for a specific bundle title
export const updateChromeProfile = async (bundleTitle: string, profile: string): Promise<void> => {
  const profiles = await loadChromeProfiles();
  profiles[bundleTitle] = profile;

  const profileData: ChromeProfileData[] = Object.entries(profiles).map(([bundleTitle, profile]) => ({
    bundleTitle,
    profile,
  }));

  await LocalStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profileData));
};
