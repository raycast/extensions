import {
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";

const labels = {
  placeId: "Place ID",
  universeId: "Universe ID",
  apiKey: "API Key",
};

export function settings<K extends keyof typeof labels>(
  ...keys: K[]
): Record<K, string> {
  const values = getPreferenceValues<Record<K, string | undefined>>();
  const result = {} as Record<K, string>;
  for (const key of keys) {
    const value = values[key]?.trim();
    if (!value) throw new Error(`Add ${labels[key]} in settings.`);
    if (
      key !== "apiKey" &&
      (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
    ) {
      throw new Error(`${labels[key]} must be a positive number.`);
    }
    result[key] = value;
  }
  return result;
}

export async function run(title: string, action: () => Promise<string | void>) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const message = await action();
    if (message) {
      toast.style = Toast.Style.Success;
      toast.title = message;
    } else {
      await toast.hide();
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title =
      error instanceof Error ? error.message : "Something went wrong.";
    toast.primaryAction = {
      title: "Open Settings",
      onAction: () => openExtensionPreferences(),
    };
  }
}
