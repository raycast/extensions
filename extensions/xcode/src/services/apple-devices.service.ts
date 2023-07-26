import { AppleDevice } from "../models/apple-device/apple-device.model";
import { AppleDeviceType } from "../models/apple-device/apple-device-type.model";
import { AppleDevicesListFilter } from "../models/apple-device/apple-devices-list-filter.model";
import fetch from "node-fetch";

export class AppleDevicesService {
  private static url =
    "https://gist.githubusercontent.com/adamawolf/3048717/raw/56e9ab1104e06ca4181b678822b9b8b054c935ad/Apple_mobile_device_types.txt";

  static async devices(filter: AppleDevicesListFilter): Promise<AppleDevice[]> {
    const response = await fetch(AppleDevicesService.url);
    const text = await response.text();
    const lines = text.split("\n");
    return (
      lines
        .map((line) => AppleDevicesService.parse(line))
        .filter((x) => x !== null)
        .map((x) => x as AppleDevice)
        .filter((x) => filter === AppleDevicesListFilter.all || x.type === (filter as unknown as AppleDeviceType)) ?? []
    );
  }

  private static parse(line: string): AppleDevice | null {
    const parts = line.split(" : ");
    if (parts.length !== 2) return null;
    const name = parts[1];
    const codeName = parts[0];
    const type = this.deviceTypeFor(name);
    if (type === null) return null;
    return { type: type, name: name, codeName: codeName };
  }

  private static deviceTypeFor(name: string): AppleDeviceType | null {
    if (name.toLowerCase().includes(AppleDeviceType.iphone.toLowerCase())) {
      return AppleDeviceType.iphone;
    } else if (name.toLowerCase().includes(AppleDeviceType.ipad.toLowerCase())) {
      return AppleDeviceType.ipad;
    } else if (name.toLowerCase().includes(AppleDeviceType.watch.toLowerCase())) {
      return AppleDeviceType.watch;
    } else {
      return null;
    }
  }
}
