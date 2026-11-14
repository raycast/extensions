import { LocalStorage } from "@raycast/api";
import { createDeviceStore } from "./device-store";

const store = createDeviceStore(LocalStorage);

export const {
  getSavedDevices,
  saveDevices,
  updateDevice,
  removeDevice,
  getSelectedDevice,
  selectDevice,
  renameDevice,
} = store;
