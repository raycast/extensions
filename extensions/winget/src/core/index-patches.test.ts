import { describe, expect, it } from "vitest";

import { type WingetOperationResult } from "../cli/types";

import { applyOperationPatch } from "./index-patches";
import { type MutableSlices } from "./index-store";

const target = { id: "Git.Git", name: "Git", source: "winget" as const };
const ok: WingetOperationResult = { success: true };

function slices(): MutableSlices {
  return {
    installed: [{ id: "Git.Git", name: "Git", version: "2.52.0", source: "winget" }],
    upgradable: [
      {
        id: "Git.Git",
        name: "Git",
        version: "2.52.0",
        available: "2.53.0",
        source: "winget",
      },
    ],
    pinned: [],
  };
}

describe("applyOperationPatch", () => {
  it("upgrade: bumps installed version from the upgradable row and removes it from upgradable", () => {
    const next = applyOperationPatch("upgrade", target, undefined, ok, slices())!;
    expect(next.installed[0]?.version).toBe("2.53.0");
    expect(next.installed[0]?.available).toBeUndefined();
    expect(next.upgradable).toHaveLength(0);
  });

  it("uninstall: removes the package from every slice", () => {
    const start = slices();
    start.pinned = [{ id: "Git.Git", source: "winget" }];
    const next = applyOperationPatch("uninstall", target, undefined, ok, start)!;
    expect(next.installed).toHaveLength(0);
    expect(next.upgradable).toHaveLength(0);
    expect(next.pinned).toHaveLength(0);
  });

  it("uninstall with version: removes only the matching row of a multi-version install", () => {
    const swift = {
      id: "Swift.Toolchain",
      name: "Swift",
      source: "winget" as const,
    };
    const start = slices();
    start.installed = [
      {
        id: "Swift.Toolchain",
        name: "Swift",
        version: "6.2.0",
        source: "winget",
      },
      {
        id: "Swift.Toolchain",
        name: "Swift",
        version: "6.2.3",
        source: "winget",
      },
    ];
    start.pinned = [{ id: "Swift.Toolchain", source: "winget" }];

    const next = applyOperationPatch("uninstall", swift, "6.2.0", ok, start)!;
    expect(next.installed.map((i) => i.version)).toEqual(["6.2.3"]);
    // One version remains installed: id-keyed pin entry stays.
    expect(next.pinned).toHaveLength(1);

    const last = applyOperationPatch("uninstall", swift, "6.2.3", ok, next)!;
    expect(last.installed).toHaveLength(0);
    expect(last.pinned).toHaveLength(0);
  });

  it("install: adds a new package to installed", () => {
    const newTarget = {
      id: "jqlang.jq",
      name: "jq",
      source: "winget" as const,
    };
    const next = applyOperationPatch("install", newTarget, undefined, ok, slices())!;
    expect(next.installed.map((i) => i.id)).toContain("jqlang.jq");
  });

  it("install-version: installs AND pins (blocking pin disclosure)", () => {
    const newTarget = {
      id: "jqlang.jq",
      name: "jq",
      source: "winget" as const,
    };
    const next = applyOperationPatch("install-version", newTarget, "1.7.1", ok, slices())!;
    expect(next.installed.find((i) => i.id === "jqlang.jq")?.version).toBe("1.7.1");
    expect(next.pinned.map((p) => p.id)).toContain("jqlang.jq");
  });

  it("pin/unpin: toggles membership in the pinned slice", () => {
    const pinned = applyOperationPatch("pin", target, undefined, ok, slices())!;
    expect(pinned.pinned.map((p) => p.id)).toContain("Git.Git");
    const unpinned = applyOperationPatch("unpin", target, undefined, ok, pinned)!;
    expect(unpinned.pinned).toHaveLength(0);
  });

  it("returns null for failures, no-ops, and kinds without slice effects", () => {
    expect(applyOperationPatch("upgrade", target, undefined, { success: false }, slices())).toBeNull();
    expect(applyOperationPatch("upgrade", target, undefined, { success: true, noop: true }, slices())).toBeNull();
    expect(applyOperationPatch("repair", target, undefined, ok, slices())).toBeNull();
    expect(applyOperationPatch("download", target, undefined, ok, slices())).toBeNull();
  });
});
