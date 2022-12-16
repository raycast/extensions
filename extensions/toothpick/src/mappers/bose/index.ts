import { Device } from "../../types";
import BoseProducts from "./products";

export default function mapBoseDevice(device: Device): Device {
  // Ensuring type safety
  const productId = device.productId ? device.productId : "unknown";

  // Redirect object to corresponding populate method
  if (Object.values(BoseProducts.Models).includes(productId)) {
    device = BoseProducts.populate(device);
  } else {
    return device;
  }

  return device;
}
