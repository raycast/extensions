import { Device } from "../../types";
import GoogleProducts from "./products";

export default function mapGoogleDevice(device: Device): Device {
  // Ensuring type safety
  const productId = device.productId ? device.productId : "unknown";

  // Redirect object to corresponding populate method
  if (Object.values(GoogleProducts.Models).includes(productId)) {
    device = GoogleProducts.populate(device);
  } else {
    return device;
  }

  return device;
}
