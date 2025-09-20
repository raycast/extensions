import { AppleDeviceType } from "./apple-device-type.model";

export interface AppleDevice {
  type: AppleDeviceType;
  name: string;
  identifier: string;
}
