import { getPreferenceValues, LocalStorage } from "@raycast/api";

const DEFAULT_ORG_KEY = "default-organization";

// Sentinel meaning "do not filter — show servers from every organization".
export const ALL_ORGS = "__all__";

export const getPreferredOrg = (): string | undefined => {
  const pref = getPreferenceValues()?.default_organization as string | undefined;
  return pref?.trim() || undefined;
};

export const getStoredDefaultOrg = async (): Promise<string | undefined> => {
  const value = await LocalStorage.getItem<string>(DEFAULT_ORG_KEY);
  return value || undefined;
};

export const setStoredDefaultOrg = async (slug: string): Promise<void> => {
  await LocalStorage.setItem(DEFAULT_ORG_KEY, slug);
};

// Precedence: in-app saved default → settings preference → all organizations.
export const resolveInitialOrg = async (): Promise<string> => {
  return (await getStoredDefaultOrg()) ?? getPreferredOrg() ?? ALL_ORGS;
};
