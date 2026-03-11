import { LocalStorage } from "@raycast/api";

const ONBOARDING_COMPLETE_KEY = "onboarding_complete";
const ACTIVE_PROVIDER_KEY = "active_provider";
const PROVIDER_URL_PREFIX = "provider_url_";

/**
 * Per-provider URL storage.
 * Each provider can have its own endpoint URL stored in LocalStorage,
 * independent of the global `serverUrl` preference.
 */
export async function getProviderUrl(provider: string): Promise<string | undefined> {
  const raw = await LocalStorage.getItem<string>(`${PROVIDER_URL_PREFIX}${provider}`);
  return raw || undefined;
}

export async function setProviderUrl(provider: string, url: string): Promise<void> {
  await LocalStorage.setItem(`${PROVIDER_URL_PREFIX}${provider}`, url);
}

export async function getActiveProvider(): Promise<string | undefined> {
  const raw = await LocalStorage.getItem<string>(ACTIVE_PROVIDER_KEY);
  return raw || undefined;
}

export async function setActiveProvider(provider: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_PROVIDER_KEY, provider);
}

export async function isOnboardingComplete(): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(ONBOARDING_COMPLETE_KEY);
  return raw === "true";
}

export async function markOnboardingComplete(): Promise<void> {
  await LocalStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
}

export async function resetOnboarding(): Promise<void> {
  await LocalStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}
