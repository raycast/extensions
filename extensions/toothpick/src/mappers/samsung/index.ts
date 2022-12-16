import { Device } from "../../types";
import SamsungProducts from "./products";

export default function mapSamsungDevice(device: Device): Device {
  // Ensuring type safety
  const productId = device.productId ? device.productId : "unknown";

  // Redirect object to corresponding populate method
  if (Object.values(SamsungProducts.Models).includes(productId)) {
    device = SamsungProducts.populate(device);
  } else {
    return device;
  }

  return device;
}
