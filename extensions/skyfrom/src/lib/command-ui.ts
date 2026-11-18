import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ExportFormat, formatLabels, formats, getExport, getSky, SkyRequest } from "./skyfrom-api";

export function preferredFormat(): ExportFormat {
  const format = getPreferenceValues<Preferences>().exportFormat;
  return formats.find((item) => item === format) ?? "css";
}

export function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Try again in a moment.";
}

export async function notifyFailure(title: string, error: unknown) {
  await showToast({ style: Toast.Style.Failure, title, message: messageFor(error) });
}

export async function copyGradient(sky: SkyRequest, format: ExportFormat = preferredFormat()) {
  if (sky.local) await getSky(sky);
  await Clipboard.copy(await getExport(sky, format));
  await showToast({ style: Toast.Style.Success, title: `Copied ${formatLabels[format]}` });
}

export async function withToast<T>(
  pending: string,
  failed: string,
  task: () => Promise<T>,
  onSuccess: (value: T) => string,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: pending });
  try {
    const value = await task();
    toast.style = Toast.Style.Success;
    toast.title = onSuccess(value);
    return value;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = failed;
    toast.message = messageFor(error);
  }
}
