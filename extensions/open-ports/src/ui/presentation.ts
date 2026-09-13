import { Color, Icon, Image } from "@raycast/api";
import { Exposure, Listener } from "../core/types";

interface ExposureMeta {
  /** Shown as the tag in the detail panel and as the accessory tooltip. */
  description: string;
  color: Color;
  icon: Icon;
}

const EXPOSURE: Record<Exposure, ExposureMeta> = {
  loopback: {
    description: "Reachable only from this Mac",
    color: Color.Green,
    icon: Icon.Lock,
  },
  "all-interfaces": {
    description: "Reachable from your network",
    color: Color.Orange,
    icon: Icon.Globe,
  },
  specific: {
    description: "Bound to one specific address",
    color: Color.Blue,
    icon: Icon.Network,
  },
};

export function exposureMeta(exposure: Exposure): ExposureMeta {
  return EXPOSURE[exposure];
}

export function ipVersionLabel(listener: Listener): string {
  return listener.ipVersions.join(" + ") || "Unknown";
}

export function listItemIcon(listener: Listener): Image.ImageLike {
  const meta = exposureMeta(listener.exposure);
  return { source: meta.icon, tintColor: meta.color };
}
