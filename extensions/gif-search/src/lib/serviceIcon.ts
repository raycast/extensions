import { Color, Icon, Image } from "@raycast/api";

import type { ServiceName } from "../preferences";

export function getServiceIcon(service: ServiceName): Image.ImageLike {
  if (service.startsWith("giphy")) return { source: "giphy-logo-square-180.png" };
  if (service.startsWith("klipy")) return { source: "klipy-logo-square-180.png" };
  if (service === "finergifs") return { source: "finergifs-logo.svg", tintColor: Color.PrimaryText };
  return Icon.Image;
}
