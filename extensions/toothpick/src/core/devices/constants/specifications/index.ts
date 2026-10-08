import AppleDevices from "./apple";
import BoseDevices from "./bose";
import GoogleDevices from "./google";
import JabraDevices from "./jabra";
import LogitechDevices from "./logitech";
import SamsungDevices from "./samsung";
import SennheiserDevices from "./sennheiser";
import SonyDevices from "./sony";
import UgreenDevices from "./ugreen";
import { DeviceDefinition } from "../../devices.types";

export const DevicesMap: Record<string, Record<string, DeviceDefinition>> = {
  "0x004C": AppleDevices,
  "0x009E": BoseDevices,
  "0x00E0": GoogleDevices,
  "0x0067": JabraDevices,
  "0x046D": LogitechDevices,
  "0x0075": SamsungDevices,
  "0x0082": SennheiserDevices,
  "0x054C": SonyDevices,
  "0x005D": UgreenDevices,
};
