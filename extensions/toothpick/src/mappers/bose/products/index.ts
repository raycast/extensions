import { Device } from "src/types";

function populate(device: Device) {
  // Populate icon and model
  switch (device.productId) {
    case BoseProducts.Models.QC35II:
      // device.icon = { source: "icons/devices/apple/airpods.svg" };
      break;
  }

  // Return populated device
  return device;
}

const BoseProducts = {
  Models: {
    QC35II: "0x4020",
  },
  populate,
};

export default BoseProducts;
