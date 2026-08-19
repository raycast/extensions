export type DiscoveredDesk = {
  identifier: string;
  name: string;
  nameQuality: number;
  connected: boolean;
};

export function validateDiscoveryName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error("Discovery Name Filter cannot be empty.");
  return name;
}

export function rememberedSelectionForRescan(
  currentIdentifier: string,
  rememberedIdentifier?: string,
): string | undefined {
  return currentIdentifier === rememberedIdentifier
    ? currentIdentifier
    : undefined;
}

export function mergeDiscoveredDesk(
  desks: DiscoveredDesk[],
  incoming: DiscoveredDesk,
): DiscoveredDesk[] {
  const existingIndex = desks.findIndex(
    (desk) => desk.identifier === incoming.identifier,
  );
  if (existingIndex === -1) return [...desks, incoming];

  const existing = desks[existingIndex];
  const useIncomingName = incoming.nameQuality >= existing.nameQuality;
  const replacement = {
    identifier: incoming.identifier,
    name: useIncomingName ? incoming.name : existing.name,
    nameQuality: Math.max(existing.nameQuality, incoming.nameQuality),
    connected: existing.connected || incoming.connected,
  };
  return desks.map((desk, index) =>
    index === existingIndex ? replacement : desk,
  );
}

export function deskOptionTitle(
  desk: DiscoveredDesk,
  rememberedIdentifier?: string,
): string {
  const state = desk.connected
    ? "Connected"
    : desk.identifier === rememberedIdentifier
      ? "Saved"
      : "Nearby";
  return `${desk.name} · ${state} · ${desk.identifier.slice(-4)}`;
}
