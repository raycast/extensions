import { Toast } from "@raycast/api";
import { Category } from "./types";

export const CATEGORIES: Category[] = [
  { id: "all", name: "All Devices" },
  { id: "ios", name: "iOS Simulators" },
  { id: "android", name: "Android Emulators" },
];

export const DEVICE_TYPE_ORDER = [
  // iOS devices
  "iPhone",
  "iPad",
  "Apple Watch",
  "Apple TV",
  "HomePod",
  "iPod",
  "Mac",
  // Android devices
  "Android Phone",
  "Android Tablet",
  "Android Wear",
  "Android TV",
  "Other",
];

export const REFRESH_INTERVAL = 5000;

export const TOAST_MESSAGES = {
  SUCCESS: {
    SIMULATOR_STARTED: { title: "Simulator started successfully", style: Toast.Style.Success },
    SIMULATOR_SHUTDOWN: { title: "Simulator shut down successfully", style: Toast.Style.Success },
    ANDROID_EMULATOR_STARTING: { title: "Starting Android emulator", style: Toast.Style.Success },
    ANDROID_EMULATOR_STOPPED: { title: "Android emulator stopped successfully", style: Toast.Style.Success },
  },
  FAILURE: {
    SIMULATOR_START_FAILED: { title: "Failed to start simulator" },
    SIMULATOR_SHUTDOWN_FAILED: { title: "Failed to shut down simulator" },
    ANDROID_EMULATOR_START_FAILED: { title: "Failed to start Android emulator" },
    ANDROID_EMULATOR_STOP_FAILED: { title: "Failed to stop Android emulator" },
  },
};

export const ACTION_TITLES = {
  BOOT_IOS: "Boot Simulator",
  SHUTDOWN_IOS: "Shutdown Simulator",
  OPEN_IOS: "Open Simulator",
  BOOT_ANDROID: "Boot Emulator",
  SHUTDOWN_ANDROID: "Shutdown Emulator",
  OPEN_ANDROID: "Open Emulator",
  REFRESH: "Refresh Devices",
  COPY_ID: "Copy Device Id",
  CONFIGURE: "Configure Android Sdk Path",
};
