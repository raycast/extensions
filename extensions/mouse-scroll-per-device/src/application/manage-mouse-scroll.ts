import {
  defaultProfile,
  HelperStatus,
  MouseDevice,
  OperationResult,
  ProfileDocument,
  ScrollProfile,
  validateProfile,
} from "../domain/models";
import { DeviceCatalog } from "../ports/device-catalog";
import { HelperController } from "../ports/helper-controller";
import { ProfileRepository } from "../ports/profile-repository";

export interface MouseScrollDashboard {
  devices: Array<{ device: MouseDevice; profile: ScrollProfile }>;
  helper: HelperStatus;
}

export class ManageMouseScroll {
  constructor(
    private readonly devices: DeviceCatalog,
    private readonly profiles: ProfileRepository,
    private readonly helper: HelperController,
  ) {}

  async load(): Promise<OperationResult<MouseScrollDashboard>> {
    const [devices, document, helper] = await Promise.all([
      this.devices.list(),
      this.profiles.load(),
      this.helper.status(),
    ]);
    if (devices.status !== "succeeded") return devices;
    if (document.status !== "succeeded") return document;
    if (helper.status !== "succeeded") return helper;
    return {
      status: "succeeded",
      value: {
        devices: devices.value.map((device) => ({
          device,
          profile: document.value.profiles[device.key] ?? defaultProfile(device),
        })),
        helper: helper.value,
      },
    };
  }

  async save(device: MouseDevice, profile: ScrollProfile): Promise<OperationResult<void>> {
    if (!device.profileKey || device.identityState !== "stable") {
      return {
        status: "unavailable",
        reason:
          "This mouse has no stable serial number or location identity, so its profile cannot safely be shared with an identical device.",
        recovery: "Reconnect the mouse directly or use a device that reports a serial number or stable location ID.",
      };
    }
    const invalid = validateProfile(profile);
    if (invalid) return { status: "failed", error: invalid };
    const loaded = await this.profiles.load();
    if (loaded.status !== "succeeded") return loaded;
    const next: ProfileDocument = {
      ...loaded.value,
      profiles: { ...loaded.value.profiles, [device.profileKey]: profile },
    };
    return this.profiles.save(next);
  }

  start(): Promise<OperationResult<HelperStatus>> {
    return this.helper.start();
  }
  install(): Promise<OperationResult<HelperStatus>> {
    return this.helper.install();
  }
  repair(): Promise<OperationResult<HelperStatus>> {
    return this.helper.repair();
  }
  stop(): Promise<OperationResult<HelperStatus>> {
    return this.helper.stop();
  }
  requestPermissions(): Promise<OperationResult<HelperStatus>> {
    return this.helper.requestPermissions();
  }
  openInputMonitoringSettings(): Promise<OperationResult<void>> {
    return this.helper.openInputMonitoringSettings();
  }
  openAccessibilitySettings(): Promise<OperationResult<void>> {
    return this.helper.openAccessibilitySettings();
  }
}
