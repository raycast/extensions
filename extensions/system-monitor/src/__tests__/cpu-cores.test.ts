import { describe, expect, it, vi } from "vitest";

import {
  coreLabel,
  getCoreClusterTypes,
  parseCoreClusterTypes,
  resetCoreClusterTypesCache,
  shortCores,
} from "../lib/cpu-cores";
import { execf } from "../lib/exec";
import { IOREG_CLUSTER_TYPE_M1_PRO as IOREG_M1_PRO } from "./fixtures/ioreg-cluster-type-m1-pro";

vi.mock("../lib/exec", () => ({
  execf: vi.fn(),
}));

describe("parseCoreClusterTypes", () => {
  it("maps every cpu-id to its cluster type on Apple Silicon", () => {
    expect(parseCoreClusterTypes(IOREG_M1_PRO, 10)).toEqual(["E", "E", "P", "P", "P", "P", "P", "P", "P", "P"]);
  });

  it("returns null on Intel, where ioreg prints nothing for cluster-type", () => {
    expect(parseCoreClusterTypes("", 8)).toBeNull();
  });

  it("returns null when the core count does not match os.cpus()", () => {
    expect(parseCoreClusterTypes(IOREG_M1_PRO, 8)).toBeNull();
    expect(parseCoreClusterTypes(IOREG_M1_PRO, 12)).toBeNull();
  });

  it("returns null when a cpu-id is missing or duplicated", () => {
    const duplicated = IOREG_M1_PRO.replace('"cpu-id" = <09000000>', '"cpu-id" = <08000000>');
    expect(parseCoreClusterTypes(duplicated, 10)).toBeNull();
  });

  it("returns null on an unknown cluster type", () => {
    const unknown = IOREG_M1_PRO.replace('"cluster-type" = <"E">', '"cluster-type" = <"X">');
    expect(parseCoreClusterTypes(unknown, 10)).toBeNull();
  });

  it("ignores non-cpu nodes that also carry a cluster-type key", () => {
    const extraNode = `+-o cluster0  <class IOPlatformDevice>
    {
      "cluster-type" = <"P">
    }

${IOREG_M1_PRO}`;
    expect(parseCoreClusterTypes(extraNode, 10)).toHaveLength(10);
  });
});

describe("getCoreClusterTypes", () => {
  it("falls back to null when ioreg fails", async () => {
    resetCoreClusterTypesCache();
    vi.mocked(execf).mockRejectedValue(new Error("boom"));

    await expect(getCoreClusterTypes(10)).resolves.toBeNull();
  });

  it("runs ioreg once and caches the verified map", async () => {
    resetCoreClusterTypesCache();
    vi.mocked(execf).mockResolvedValue(IOREG_M1_PRO);

    await expect(getCoreClusterTypes(10)).resolves.toHaveLength(10);
    await expect(getCoreClusterTypes(10)).resolves.toHaveLength(10);
    expect(vi.mocked(execf)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(execf)).toHaveBeenCalledWith("/usr/sbin/ioreg", ["-r", "-d", "1", "-k", "cluster-type"]);
  });
});

describe("coreLabel", () => {
  it("prefixes the core number with its verified cluster", () => {
    const types = parseCoreClusterTypes(IOREG_M1_PRO, 10);
    expect(coreLabel(1, types)).toBe("E1");
    expect(coreLabel(2, types)).toBe("E2");
    expect(coreLabel(3, types)).toBe("P3");
    expect(coreLabel(10, types)).toBe("P10");
  });

  it("falls back to C1…Cn when the cluster map is unverified", () => {
    expect(coreLabel(1, null)).toBe("C1");
    expect(coreLabel(10, null)).toBe("C10");
  });
});

describe("shortCores", () => {
  it("abbreviates the Performance/Efficiency breakdown", () => {
    expect(shortCores("10 (8 Performance and 2 Efficiency)")).toBe("10 (8P + 2E)");
  });

  it("is case-insensitive, matching older system_profiler phrasing", () => {
    expect(shortCores("8 (4 performance and 4 efficiency)")).toBe("8 (4P + 4E)");
  });

  it("leaves Intel core counts untouched", () => {
    expect(shortCores("8")).toBe("8");
  });

  it("renders a dash while the value is missing", () => {
    expect(shortCores(undefined)).toBe("-");
    expect(shortCores("")).toBe("-");
  });
});
