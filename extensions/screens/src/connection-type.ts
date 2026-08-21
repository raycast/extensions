import { Color, Icon, Image, List } from "@raycast/api";
import { ConnectionType } from "./archive";
import { ConnectTarget } from "./connect";

export interface TypeSection {
  title: string;
  types: ConnectionType[];
}

export const TYPE_SECTIONS: TypeSection[] = [
  { title: "Local Network", types: ["local"] },
  { title: "Tailscale", types: ["tailscale"] },
  { title: "Remote", types: ["remote"] },
  { title: "Other", types: ["url", "saved", "recent"] },
];

export const TYPE_ICONS: Record<ConnectionType, Image.ImageLike> = {
  local: Icon.Desktop,
  tailscale: { source: "tailscale.png", tintColor: Color.PrimaryText },
  remote: Icon.Globe,
  url: Icon.Link,
  saved: Icon.Desktop,
  recent: Icon.Clock,
};

export const ALL_TYPES = "all";

export function sectionTitle(type: ConnectionType): string {
  return TYPE_SECTIONS.find((section) => section.types.includes(type))?.title ?? "Other";
}

/** The sections `connections` actually fills, so a filter only offers types the user has. */
export function occupiedSections(connections: { type: ConnectionType }[]): TypeSection[] {
  return TYPE_SECTIONS.filter((section) => connections.some((entry) => section.types.includes(entry.type)));
}

export function groupByType<T extends { type: ConnectionType }>(
  connections: T[],
  filter: string,
  sort?: (a: T, b: T) => number,
): { title: string; connections: T[] }[] {
  return TYPE_SECTIONS.filter((section) => filter === ALL_TYPES || section.title === filter)
    .map((section) => {
      const matching = connections.filter((entry) => section.types.includes(entry.type));
      return { title: section.title, connections: sort ? matching.sort(sort) : matching };
    })
    .filter((section) => section.connections.length > 0);
}

/**
 * Accessories in a fixed layout, so rows line up down the list.
 *
 * Raycast right-aligns accessories, which means a row missing one pulls every accessory to its left
 * out of column. The two trailing slots are therefore always present, an empty status passing `null`
 * to hold its place, and the type icon anchors the right edge at a constant width. Anything whose
 * width varies with content belongs in `leading`, furthest from that edge.
 */
export function connectionAccessories(
  type: ConnectionType,
  status?: List.Item.Accessory,
  leading: List.Item.Accessory[] = [],
): List.Item.Accessory[] {
  return [...leading, status ?? { icon: null }, { icon: TYPE_ICONS[type], tooltip: sectionTitle(type) }];
}

/**
 * The type to store for a section the user picked. An imported connection keeps the more specific
 * type it came in with whenever that still belongs to the chosen section.
 */
export function typeForSection(title: string, current: ConnectionType): ConnectionType {
  const section = TYPE_SECTIONS.find((entry) => entry.title === title) ?? TYPE_SECTIONS[0];
  return section.types.includes(current) ? current : section.types[0];
}

/** How a row reaches its host, when that is worth calling out. */
export function targetStatus(target: ConnectTarget): List.Item.Accessory | undefined {
  if (target.kind === "direct") {
    return {
      icon: { source: Icon.ArrowRight, tintColor: Color.SecondaryText },
      tooltip: "Connects to this host directly rather than through the connection saved in Screens.",
    };
  }
  if (target.ambiguous) {
    return {
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      tooltip: "Another connection shares this name, so Screens decides which one opens.",
    };
  }
  return undefined;
}
