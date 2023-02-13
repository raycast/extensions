import { Device } from "src/types";

function populate(device: Device) {
  // Populate icon and model
  switch (device.productId) {
    case GoogleProducts.Models.PixelBudsPro:
      device.icon = { source: "icons/devices/google/pixel.buds.pro.svg" };
      break;
  }

  // Return populated device
  return device;
}

const GoogleProducts = {
  Models: {
    PixelBudsPro: "0x3004",
  },
  populate,
};

export default GoogleProducts;
