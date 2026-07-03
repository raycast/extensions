import { describe, expect, test, jest, beforeEach } from "@jest/globals";
import { LocalStorage, getPreferenceValues } from "@raycast/api";
import {
  getVolumeStep,
  getCachedDeviceIP,
  setCachedDeviceIP,
  clearCachedDeviceIP,
  isCacheValid,
  getSelectedDeviceIP,
  setSelectedDeviceIP,
  clearSelectedDeviceIP,
} from "./preferences";

jest.mock("@raycast/api");

describe("Wiim Preferences - Cached Device IP", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getCachedDeviceIP returns undefined when not set", async () => {
    (LocalStorage.getItem as jest.Mock).mockReturnValueOnce(Promise.resolve(null));
    expect(await getCachedDeviceIP()).toBeUndefined();
  });

  test("getCachedDeviceIP returns stored IP", async () => {
    (LocalStorage.getItem as jest.Mock).mockReturnValueOnce(Promise.resolve("192.168.1.1"));
    expect(await getCachedDeviceIP()).toBe("192.168.1.1");
  });

  test("setCachedDeviceIP stores IP and timestamp", async () => {
    await setCachedDeviceIP("192.168.1.1");
    expect(LocalStorage.setItem).toHaveBeenCalledWith("wiim_cached_device_ip", "192.168.1.1");
    expect(LocalStorage.setItem).toHaveBeenCalledWith("wiim_discovery_cache_time", expect.any(String));
  });

  test("clearCachedDeviceIP removes IP and timestamp", async () => {
    await clearCachedDeviceIP();
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("wiim_cached_device_ip");
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("wiim_discovery_cache_time");
  });

  test("isCacheValid returns false when no timestamp", async () => {
    (LocalStorage.getItem as jest.Mock).mockReturnValueOnce(Promise.resolve(null));
    expect(await isCacheValid()).toBe(false);
  });

  test("isCacheValid returns false when timestamp is old", async () => {
    const oldTimestamp = Date.now() - 31 * 60 * 1000; // 31 minutes ago
    (LocalStorage.getItem as jest.Mock).mockReturnValueOnce(Promise.resolve(oldTimestamp.toString()));
    expect(await isCacheValid()).toBe(false);
  });

  test("isCacheValid returns true when timestamp is recent", async () => {
    const recentTimestamp = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    (LocalStorage.getItem as jest.Mock).mockReturnValueOnce(Promise.resolve(recentTimestamp.toString()));
    expect(await isCacheValid()).toBe(true);
  });
});

describe("Wiim Preferences - Selected Device IP", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getSelectedDeviceIP returns undefined when not set", async () => {
    (LocalStorage.getItem as jest.Mock).mockReturnValueOnce(Promise.resolve(null));
    expect(await getSelectedDeviceIP()).toBeUndefined();
  });

  test("getSelectedDeviceIP returns stored IP", async () => {
    (LocalStorage.getItem as jest.Mock).mockReturnValueOnce(Promise.resolve("192.168.1.1"));
    expect(await getSelectedDeviceIP()).toBe("192.168.1.1");
  });

  test("setSelectedDeviceIP stores IP", async () => {
    await setSelectedDeviceIP("192.168.1.1");
    expect(LocalStorage.setItem).toHaveBeenCalledWith("wiim_selected_device_ip", "192.168.1.1");
  });

  test("clearSelectedDeviceIP removes selected IP", async () => {
    await clearSelectedDeviceIP();
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("wiim_selected_device_ip");
  });
});

describe("Wiim Preferences - Volume Step", () => {
  test("getVolumeStep returns default 5 when not set", () => {
    (getPreferenceValues as jest.Mock).mockReturnValueOnce({ wiim_volume_step: "" });
    expect(getVolumeStep()).toBe(5);
  });

  test("getVolumeStep returns parsed number from preferences", () => {
    (getPreferenceValues as jest.Mock).mockReturnValueOnce({ wiim_volume_step: "10" });
    expect(getVolumeStep()).toBe(10);
  });

  test("getVolumeStep clamps values to range 1-50", () => {
    (getPreferenceValues as jest.Mock).mockReturnValueOnce({ wiim_volume_step: "0" });
    expect(getVolumeStep()).toBe(1);
    (getPreferenceValues as jest.Mock).mockReturnValueOnce({ wiim_volume_step: "100" });
    expect(getVolumeStep()).toBe(50);
  });

  test("getVolumeStep returns default for invalid input", () => {
    (getPreferenceValues as jest.Mock).mockReturnValueOnce({ wiim_volume_step: "abc" });
    expect(getVolumeStep()).toBe(5);
  });
});
