import { describe, expect, it } from "vitest";
import { getMapTileUrl } from "../map";

describe("getMapTileUrl", () => {
  it("returns a valid openstreetmap tile URL", () => {
    const url = getMapTileUrl(59.9139, 10.7522, 14);
    expect(url).toMatch(/^https:\/\/tile\.openstreetmap\.org\/14\/\d+\/\d+\.png$/);
  });

  it("produces consistent output for same inputs", () => {
    const a = getMapTileUrl(59.9139, 10.7522, 14);
    const b = getMapTileUrl(59.9139, 10.7522, 14);
    expect(a).toBe(b);
  });

  it("produces different tiles for different coordinates", () => {
    const oslo = getMapTileUrl(59.9139, 10.7522, 14);
    const bergen = getMapTileUrl(60.3913, 5.3221, 14);
    expect(oslo).not.toBe(bergen);
  });

  it("tile coordinates change with zoom level", () => {
    const z14 = getMapTileUrl(59.9139, 10.7522, 14);
    const z10 = getMapTileUrl(59.9139, 10.7522, 10);
    expect(z14).not.toBe(z10);
  });
});
