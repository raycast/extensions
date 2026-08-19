import { describe, expect, it } from "vitest";
import {
  deskOptionTitle,
  DiscoveredDesk,
  mergeDiscoveredDesk,
  rememberedSelectionForRescan,
  validateDiscoveryName,
} from "./desk-discovery";

describe("desk discovery", () => {
  it("adds each discovered desk once and keeps the connected state", () => {
    const remembered: DiscoveredDesk = {
      identifier: "00000000-0000-0000-0000-00000000ABCD",
      name: "Desk",
      nameQuality: 0,
      connected: false,
    };
    const connected = { ...remembered, connected: true };

    expect(mergeDiscoveredDesk([], remembered)).toEqual([remembered]);
    expect(mergeDiscoveredDesk([remembered], connected)).toEqual([connected]);
  });

  it("keeps the best available device name", () => {
    const cached: DiscoveredDesk = {
      identifier: "desk-id",
      name: "Desk 1234",
      nameQuality: 1,
      connected: false,
    };
    const fallback = {
      ...cached,
      name: "Desk",
      nameQuality: 0,
      connected: true,
    };

    expect(mergeDiscoveredDesk([cached], fallback)).toEqual([
      { ...cached, connected: true },
    ]);
  });

  it("labels connected, saved, and nearby desks", () => {
    const desk: DiscoveredDesk = {
      identifier: "00000000-0000-0000-0000-00000000ABCD",
      name: "Desk 1234",
      nameQuality: 2,
      connected: false,
    };

    expect(deskOptionTitle(desk, desk.identifier)).toBe(
      "Desk 1234 · Saved · ABCD",
    );
    expect(deskOptionTitle({ ...desk, connected: true })).toBe(
      "Desk 1234 · Connected · ABCD",
    );
    expect(deskOptionTitle(desk)).toBe("Desk 1234 · Nearby · ABCD");
  });

  it("requires a non-empty discovery name filter", () => {
    expect(validateDiscoveryName("  Desk  ")).toBe("Desk");
    expect(() => validateDiscoveryName("   ")).toThrow(
      "Discovery Name Filter cannot be empty.",
    );
  });

  it("keeps only an explicitly saved selection during a rescan", () => {
    expect(rememberedSelectionForRescan("saved-id", "saved-id")).toBe(
      "saved-id",
    );
    expect(
      rememberedSelectionForRescan("nearby-candidate", "saved-id"),
    ).toBeUndefined();
  });
});
