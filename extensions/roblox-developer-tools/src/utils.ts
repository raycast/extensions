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

export async function run(
  title: string,
  action: (toast: Toast) => Promise<string | void>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const message = await action(toast);
    if (message) {
      toast.style = Toast.Style.Success;
      toast.title = message;
    } else {
      await toast.hide();
    }
  } catch (error) {
    await showError(error, toast);
  }
}

export async function showError(error: unknown, toast?: Toast) {
  const failure =
    toast ??
    (await showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong.",
    }));
  failure.style = Toast.Style.Failure;
  failure.title =
    error instanceof Error ? error.message : "Something went wrong.";
  failure.primaryAction = {
    title: "Open Settings",
    onAction: () => openExtensionPreferences(),
  };
}
