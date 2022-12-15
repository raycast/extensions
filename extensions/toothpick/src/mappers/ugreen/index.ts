import { Device, RawDeviceData } from "../../types";
import UgreenProducts from "./products";

export default function mapUgreenDevice(device: Device, rawDeviceData: RawDeviceData): Device {
  // Ensuring type safety
  const productId = device.productId ? device.productId : "unknown";

  // Redirect object to corresponding populate method
  if (Object.values(UgreenProducts.Models).includes(productId)) {
    device = UgreenProducts.populate(device, rawDeviceData);
  } else {
    return device;
  }

  return device;
}
