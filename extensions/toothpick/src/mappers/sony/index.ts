import { Device, RawDeviceData } from "../../types";
import SonyProducts from "./products";

export default function mapSonyDevice(device: Device, rawDeviceData: RawDeviceData): Device {
  // Ensuring type safety
  const productId = device.productId ? device.productId : "unknown";

  // Redirect object to corresponding populate method
  if (Object.values(SonyProducts.Models).includes(productId)) {
    device = SonyProducts.populate(device, rawDeviceData);
  } else {
    return device;
  }

  return device;
}
