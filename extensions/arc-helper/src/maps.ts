export interface GameMap {
  /** Slug used by MetaForge map URLs and quest/item locations. */
  slug: string;
  name: string;
  /** Name used by the events schedule. */
  eventName: string;
  description: string;
  icon?: string;
}

export const MAPS: GameMap[] = [
  {
    slug: "dam",
    name: "Dam Battlegrounds",
    eventName: "Dam",
    description: "Flooded industrial zone around the hydroelectric dam",
    icon: "https://cdn.metaforge.app/arc-raiders/custom/dam.webp",
  },
  {
    slug: "spaceport",
    name: "The Spaceport",
    eventName: "Spaceport",
    description: "Abandoned launch facility with vertical gameplay",
    icon: "https://cdn.metaforge.app/arc-raiders/custom/spaceport.webp",
  },
  {
    slug: "buried-city",
    name: "Buried City",
    eventName: "Buried City",
    description: "Underground ruins and collapsed structures",
    icon: "https://cdn.metaforge.app/arc-raiders/custom/buried-city.webp",
  },
  {
    slug: "blue-gate",
    name: "Blue Gate",
    eventName: "Blue Gate",
    description: "Coastal area with research facilities",
    icon: "https://cdn.metaforge.app/arc-raiders/ui/blue-gate.webp",
  },
  {
    slug: "stella-montis",
    name: "Stella Montis",
    eventName: "Stella Montis",
    description: "Mountain research complex",
    icon: "https://cdn.metaforge.app/arc-raiders/ui/stella-montis.webp",
  },
  {
    slug: "riven-tides",
    name: "Riven Tides",
    eventName: "Riven Tides",
    description: "Coastal map with beachcombing and night raid events",
    icon: "https://cdn.metaforge.app/arc-raiders/ui/riventides.webp",
  },
  {
    slug: "pendola-pass",
    name: "Pendola Pass",
    eventName: "Pendola Pass",
    description: "Frozen Italian village and Exodus transit hub (Frozen Trail)",
  },
];

export function findMap(nameOrSlug: string): GameMap | undefined {
  const needle = nameOrSlug.toLowerCase();
  return MAPS.find(
    (map) => map.slug === needle || map.eventName.toLowerCase() === needle || map.name.toLowerCase() === needle,
  );
}

export function getMapName(slug: string): string {
  return findMap(slug)?.name ?? slug;
}
