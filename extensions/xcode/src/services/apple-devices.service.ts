import { AppleDevice } from "../models/apple-device/apple-device.model";
import { AppleDeviceType } from "../models/apple-device/apple-device-type.model";
import { AppleDevicesListFilter } from "../models/apple-device/apple-devices-list-filter.model";
import fetch from "node-fetch";

export class AppleDevicesService {
  private static url = "https://api.ipsw.me/v4/devices";

  static async devices(filter: AppleDevicesListFilter): Promise<AppleDevice[]> {
    const response = await fetch(AppleDevicesService.url);
    const json = (await response.json()) as AppleDevice[];
    return (
      json
        .map((x) => {
          const type = AppleDevicesService.deviceTypeFor(x.name);
          if (type === null) return null;
          return { type: type, name: x.name, identifier: x.identifier };
        })
        .filter((x) => x !== null)
        .map((x) => x as AppleDevice)
        .filter((x) => filter === AppleDevicesListFilter.all || x.type === (filter as unknown as AppleDeviceType)) ?? []
    );
  }

  private static deviceTypeFor(name: string): AppleDeviceType | null {
    if (name.toLowerCase().includes(AppleDeviceType.iphone.toLowerCase())) {
      return AppleDeviceType.iphone;
    } else if (name.toLowerCase().includes(AppleDeviceType.ipad.toLowerCase())) {
      return AppleDeviceType.ipad;
    } else if (name.toLowerCase().includes(AppleDeviceType.watch.toLowerCase())) {
      return AppleDeviceType.watch;
    } else if (name.toLowerCase().includes(AppleDeviceType.mac.toLowerCase())) {
      return AppleDeviceType.mac;
    } else {
      return null;
    }
  }
}
