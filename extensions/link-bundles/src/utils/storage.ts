import fs from "fs";
import path from "path";
import { Bundle } from "../types";

const BUNDLES_STORAGE_PATH = path.join(process.env.HOME || "", ".raycast-link-bundles/bundles.json");
const CHROME_PROFILES_PATH = path.join(process.env.HOME || "", ".raycast-link-bundles/bundles-chrome-profiles.json");

interface ChromeProfileData {
  bundleTitle: string;
  profile: string;
}

// Load Chrome profiles from separate file
const loadChromeProfiles = (): Record<string, string> => {
  try {
    if (fs.existsSync(CHROME_PROFILES_PATH)) {
      const data = fs.readFileSync(CHROME_PROFILES_PATH, "utf8");
      const profiles: ChromeProfileData[] = JSON.parse(data);
      return profiles.reduce(
        (acc, { bundleTitle, profile }) => ({
          ...acc,
          [bundleTitle]: profile,
        }),
        {},
      );
    }
  } catch (error) {
    console.error("Failed to load Chrome profiles:", error);
  }
  return {};
};

// Save Chrome profiles to separate file
const saveChromeProfiles = (bundles: Bundle[]) => {
  try {
    const profileData: ChromeProfileData[] = bundles
      .filter((bundle) => bundle.chromeProfile)
      .map((bundle) => ({
        bundleTitle: bundle.title,
        profile: bundle.chromeProfile || "Default",
      }));

    fs.writeFileSync(CHROME_PROFILES_PATH, JSON.stringify(profileData, null, 2));
  } catch (error) {
    console.error("Failed to save Chrome profiles:", error);
  }
};

export const loadBundles = (): Bundle[] => {
  try {
    if (fs.existsSync(BUNDLES_STORAGE_PATH)) {
      const data = fs.readFileSync(BUNDLES_STORAGE_PATH, "utf8");
      const loadedBundles = JSON.parse(data);
      const chromeProfiles = loadChromeProfiles();

      return loadedBundles.map((bundle: Bundle) => ({
        ...bundle,
        chromeProfile: chromeProfiles[bundle.title] || "Default",
      }));
    }
  } catch (error) {
    console.error("Failed to load bundles:", error);
  }
  return [];
};

export const saveBundles = (bundles: Bundle[]) => {
  try {
    // Save bundles without chrome profile information
    const bundlesWithoutProfiles = bundles.map(({ ...bundle }) => bundle);
    fs.writeFileSync(BUNDLES_STORAGE_PATH, JSON.stringify(bundlesWithoutProfiles, null, 2));

    // Save chrome profiles separately
    saveChromeProfiles(bundles);
  } catch (error) {
    console.error("Failed to save bundles:", error);
  }
};

// Utility function to get Chrome profile for a specific bundle title
export const getChromeProfile = (bundleTitle: string): string => {
  const profiles = loadChromeProfiles();
  return profiles[bundleTitle] || "Default";
};

// Utility function to update Chrome profile for a specific bundle title
export const updateChromeProfile = (bundleTitle: string, profile: string) => {
  const profiles = loadChromeProfiles();
  profiles[bundleTitle] = profile;

  const profileData: ChromeProfileData[] = Object.entries(profiles).map(([bundleTitle, profile]) => ({
    bundleTitle,
    profile,
  }));

  fs.writeFileSync(CHROME_PROFILES_PATH, JSON.stringify(profileData, null, 2));
};
