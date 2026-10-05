import { showToast, Toast } from "@raycast/api";
import { Device, DeviceCategories, DeviceCategory, FunctionItem } from "./interfaces";
import { isTuyaApiError } from "./errors";

export const getCategory = (categories: DeviceCategory[], categoryCode: DeviceCategories): DeviceCategories => {
  const categoryInfo = categories.find((category) => category.code === categoryCode);
  if (categoryInfo) {
    return categoryInfo.name;
  }
  return categoryCode;
};

export const isPinned = (device: Device, oldDevices: Device[]) => {
  const oldState = oldDevices.find((oldDevice) => oldDevice.id === device.id);

  if (oldState) {
    return oldState.pinned ?? false;
  }

  return false;
};

/** Tuya returns instruction names in Chinese for many products; those are not useful here. */
const CJK = /[\u3400-\u9fff\u3040-\u30ff]/;

export const isUsableName = (name?: string): boolean => Boolean(name && name.trim() && !CJK.test(name));

/**
 * Merges the instruction set metadata onto the device's live status. `functions` is
 * fetched once for the whole account rather than per device.
 */
export const getDeviceFunctions = (
  device: Device,
  oldDeviceInfo?: Device,
  functions: FunctionItem[] = [],
): FunctionItem[] => {
  return (device.status ?? []).map((statusItem) => {
    const oldStatusInfo = oldDeviceInfo?.status?.find((old) => old.code === statusItem.code);
    const functionInfo = functions.find((info) => info.code === statusItem.code);

    const name = isUsableName(oldStatusInfo?.name)
      ? oldStatusInfo?.name
      : isUsableName(functionInfo?.name)
        ? functionInfo?.name
        : undefined;

    return {
      ...statusItem,
      type: functionInfo?.type ?? statusItem.type,
      values: functionInfo?.values ?? statusItem.values,
      ...(name ? { name } : {}),
    };
  });
};

/**
 * `active_time` is a Unix timestamp in seconds (Tuya's own example is 1589505938),
 * not an elapsed duration.
 */
export function formatActiveTime(activeTime?: number): string {
  if (typeof activeTime !== "number" || !Number.isFinite(activeTime) || activeTime <= 0) {
    return "Unknown";
  }
  return new Date(activeTime * 1000).toLocaleString();
}

const CODE_MESSAGES: Record<number, string> = {
  1004: "Sign invalid. Please verify your Access ID and Access Secret.",
  1010: "Access token expired or invalid. Please verify your Access ID and Access Secret.",
  1011: "Access token is missing. Please verify your Access ID and Access Secret.",
  1013: "Request time is invalid. Check that your system clock is correct.",
  1101: "Access ID is invalid. Please verify your credentials.",
  1106: "Permission denied. Check that your IoT Core subscription is still active and that your app account is linked under Devices, not Users.",
  1114: "Sign invalid. Please verify your Access ID and Access Secret.",
  2009: "Access ID is invalid. Please verify your credentials.",
  28841002: "Your cloud plan has expired. Renew the IoT Core subscription on the Tuya IoT Platform.",
  28841105: "Your project is not authorized for this API. See the troubleshooting section of the README.",
};

/** Legacy fallback for errors that are not TuyaApiError but embed a code in their text. */
const LEGACY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(1114|1004)\b/, CODE_MESSAGES[1004]],
  [/\b(1010|1011)\b/, CODE_MESSAGES[1010]],
  [/\b1106\b/, CODE_MESSAGES[1106]],
  [/\b(28841105|28841002)\b/, CODE_MESSAGES[28841105]],
];

/** The user-facing text for a failure, independent of how it gets displayed. */
export function describeError(error: unknown): string {
  if (isTuyaApiError(error)) {
    return CODE_MESSAGES[error.code] ?? `Tuya API error ${error.code}: ${error.tuyaMessage}`;
  }
  const raw = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return LEGACY_PATTERNS.find(([pattern]) => pattern.test(raw))?.[1] ?? raw;
}

export function ShowToastError(error: unknown) {
  showToast(Toast.Style.Failure, "Tuya Smart", describeError(error));
}
