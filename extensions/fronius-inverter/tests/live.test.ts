import { expect, it } from "vitest";
import { fetchFroniusSnapshot } from "../src/service";

const baseUrl = process.env.FRONIUS_BASE_URL;

it.skipIf(!baseUrl)(
  "loads live inverter and power-flow data",
  async () => {
    const snapshot = await fetchFroniusSnapshot(baseUrl as string);
    expect(snapshot.inverters.length).toBeGreaterThan(0);
    expect(snapshot.timestamp).toBeTruthy();
    expect(snapshot.site.P_PV === null || Number.isFinite(snapshot.site.P_PV)).toBe(true);
    expect(snapshot.apiVersion?.APIVersion).toBe(1);
    expect(snapshot.site.E_Day === null || Number.isFinite(snapshot.site.E_Day)).toBe(true);
    expect(snapshot.meters.length).toBeGreaterThan(0);
    expect(snapshot.storages.length).toBeGreaterThan(0);
    expect(snapshot.ohmpilots.length).toBeGreaterThan(0);
    expect(snapshot.warnings).toEqual([]);
  },
  15_000,
);
