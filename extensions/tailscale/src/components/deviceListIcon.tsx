import { Image } from "@raycast/api";

export function getDeviceListIcon(online: boolean) {
  return online
    ? {
        source: { light: "connected_light.png", dark: "connected_dark.png" },
        mask: Image.Mask.Circle,
      }
    : {
        source: { light: "lastseen_light.png", dark: "lastseen_dark.png" },
        mask: Image.Mask.Circle,
      };
}
