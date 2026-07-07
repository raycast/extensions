import { LocalStorage } from "@raycast/api";

const ONBOARDING_KEY = "ticktick_onboarding_v1";

export async function markOnboardingComplete(): Promise<void> {
  await LocalStorage.setItem(ONBOARDING_KEY, "done");
}

export async function isOnboardingComplete(): Promise<boolean> {
  const val = await LocalStorage.getItem<string>(ONBOARDING_KEY);
  return !!val;
}
