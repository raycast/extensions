import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

type UserPreferences = Readonly<{
  gap: number;
  disableToasts: boolean;
  keepWindowOpenAfterTiling: boolean;
}>;

export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    const userPreferences = getPreferenceValues();

    return {
      gap: parseInt(userPreferences.gap as string, 10) ?? 0,
      disableToasts: (userPreferences.disableToasts as boolean) ?? false,
      keepWindowOpenAfterTiling: (userPreferences.keepWindowOpenAfterTiling as boolean) ?? false,
    } as UserPreferences;
  } catch {
    await showFailureToast("Failed to get preferences", {
      message: "Using default values.",
    }).catch(console.error);

    return {
      gap: 0,
      disableToasts: false,
      keepWindowOpenAfterTiling: false,
    } as UserPreferences;
  }
}
