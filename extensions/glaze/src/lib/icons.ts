import type { Image } from "@raycast/api";
import type { GlazeApp } from "./types";
export function getAppIcon(app: GlazeApp): Image.ImageLike {
  return app.bundlePath ? { fileIcon: app.bundlePath } : "extension-icon.png";
}
