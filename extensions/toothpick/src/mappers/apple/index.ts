import { Device, RawDeviceData } from "../../types";
import Airpods from "./products/airpods";
import Beats from "./products/beats";
import MagicKeyboard from "./products/magic-keyboard";
import MagicMouse from "./products/magic-mouse";
import MagicTrackpad from "./products/magic-trackpad";

export default function mapAppleDevice(device: Device, rawDeviceData: RawDeviceData): Device {
  // Ensuring type safety
  const productId = device.productId ? device.productId : "unknown";

  // Redirect object to corresponding populate method
  if (Object.values(Airpods.Models).includes(productId)) {
    device = Airpods.populate(device, rawDeviceData);
  } else if (Object.values(MagicKeyboard.Models).includes(productId)) {
    device = MagicKeyboard.populate(device, rawDeviceData);
  } else if (Object.values(MagicMouse.Models).includes(productId)) {
    device = MagicMouse.populate(device, rawDeviceData);
  } else if (Object.values(MagicTrackpad.Models).includes(productId)) {
    device = MagicTrackpad.populate(device, rawDeviceData);
  } else if (Object.values(Beats.Models).includes(productId)) {
    device = Beats.populate(device, rawDeviceData);
  } else {
    return device;
  }

  return device;
}
