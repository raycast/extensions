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
