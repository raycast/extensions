import { Device } from "src/types";

function populate(device: Device) {
  // Populate icon and model
  switch (device.productId) {
    case SamsungProducts.Models.GalaxyBudsLiveD701:
      device.icon = { source: "icons/devices/samsung/galaxy.buds.live.svg" };
      break;
  }

  // Return populated device
  return device;
}

const SamsungProducts = {
  Models: {
    GalaxyBudsLiveD701: "0xA013",
  },
  populate,
};

export default SamsungProducts;
