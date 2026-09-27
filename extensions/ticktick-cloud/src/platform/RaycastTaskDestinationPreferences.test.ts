import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { TaskDestinationPreferencePort, TaskDestinationScope } from "../application/taskDestination";

const acceptedStorage = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("./RaycastTaskDestinationStorage", () => ({
  raycastTaskDestinationStorage: acceptedStorage,
}));

import { raycastTaskDestinationPreferences } from "./RaycastTaskDestinationPreferences";

const scope: TaskDestinationScope = Object.freeze({ backendId: "mcp", accountKey: "oauth:account" });

beforeEach(() => {
  acceptedStorage.getItem.mockReset();
  acceptedStorage.setItem.mockReset();
  acceptedStorage.removeItem.mockReset();
});

describe("raycastTaskDestinationPreferences", () => {
  it("exports one application preference port without reading accepted storage at module initialization", async () => {
    vi.resetModules();

    const isolatedModule = await import("./RaycastTaskDestinationPreferences");

    expectTypeOf(isolatedModule.raycastTaskDestinationPreferences).toMatchTypeOf<TaskDestinationPreferencePort>();
    expect(acceptedStorage.getItem).not.toHaveBeenCalled();
    expect(acceptedStorage.setItem).not.toHaveBeenCalled();
    expect(acceptedStorage.removeItem).not.toHaveBeenCalled();
  });

  it("reuses the accepted Raycast destination storage for scoped loads", async () => {
    acceptedStorage.getItem.mockResolvedValue("project-work");

    await expect(raycastTaskDestinationPreferences.load(scope)).resolves.toBe("project-work");

    expect(acceptedStorage.getItem).toHaveBeenCalledTimes(1);
    expect(acceptedStorage.getItem.mock.calls[0]?.[0]).toMatch(/^ticktick\.defaultDestination\.v1\.mcp\.[0-9a-f]{64}$/);
    expect(acceptedStorage.setItem).not.toHaveBeenCalled();
    expect(acceptedStorage.removeItem).not.toHaveBeenCalled();
  });

  it("contains only the accepted storage and preference-store wiring", () => {
    const source = readFileSync(resolve(__dirname, "RaycastTaskDestinationPreferences.ts"), "utf8");
    const imports = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), (match) => match[1]).sort();

    expect(imports).toEqual(["./RaycastTaskDestinationStorage", "./taskDestinationPreferences"]);
    expect(source).not.toMatch(/@raycast|LocalStorage|Keychain|console\.|JSON\.|setTimeout|retry|fetch\s*\(/i);
  });
});
