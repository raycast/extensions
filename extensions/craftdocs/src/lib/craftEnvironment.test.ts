import { describe, expect, it } from "vitest";
import { Application } from "@raycast/api";
import {
  buildCraftPaths,
  normalizePreferredApplication,
  resolveCraftEnvironment,
  supportedCraftBundleIds,
} from "./craftEnvironment";

const regularCraftApp: Application = {
  name: "Craft",
  path: "/Applications/Craft.app",
  bundleId: supportedCraftBundleIds[0],
};

const setappCraftApp: Application = {
  name: "Craft",
  path: "/Applications/Setapp/Craft.app",
  bundleId: supportedCraftBundleIds[1],
};

describe("normalizePreferredApplication", () => {
  it("normalizes bundle id strings", () => {
    expect(normalizePreferredApplication("com.lukilabs.lukiapp")).toEqual({
      kind: "bundleId",
      value: "com.lukilabs.lukiapp",
    });
  });

  it("normalizes application objects", () => {
    expect(normalizePreferredApplication(setappCraftApp)).toEqual({
      kind: "bundleId",
      value: "com.lukilabs.lukiapp-setapp",
    });
  });
});

describe("resolveCraftEnvironment", () => {
  it("returns missing-app when no supported Craft app is installed", () => {
    const environment = resolveCraftEnvironment({
      installedApplications: [],
      preferredApplication: undefined,
      supportPath: "/tmp/raycast-support",
      homeDirectory: "/Users/test",
      fileExists: () => false,
    });

    expect(environment).toEqual({ status: "missing-app" });
  });

  it("returns invalid-selection for unsupported chosen apps", () => {
    const environment = resolveCraftEnvironment({
      installedApplications: [
        {
          name: "Notes",
          path: "/Applications/Notes.app",
          bundleId: "com.apple.Notes",
        },
      ],
      preferredApplication: "/Applications/Notes.app",
      supportPath: "/tmp/raycast-support",
      homeDirectory: "/Users/test",
      fileExists: () => false,
    });

    expect(environment).toEqual({
      status: "invalid-selection",
      selection: "/Applications/Notes.app",
      reason: "unsupported-application",
    });
  });

  it("auto-selects the installed supported Craft app and resolves paths", () => {
    const expectedPaths = buildCraftPaths({
      bundleId: supportedCraftBundleIds[1],
      homeDirectory: "/Users/test",
      supportPath: "/tmp/raycast-support",
    });

    const environment = resolveCraftEnvironment({
      installedApplications: [setappCraftApp],
      preferredApplication: undefined,
      supportPath: "/tmp/raycast-support",
      homeDirectory: "/Users/test",
      fileExists: (targetPath) => [expectedPaths.dataRoot, expectedPaths.searchPath].includes(targetPath),
    });

    expect(environment).toEqual({
      status: "ready",
      application: setappCraftApp,
      bundleId: supportedCraftBundleIds[1],
      ...expectedPaths,
    });
  });

  it("returns missing-data-root when Craft has not initialized its container", () => {
    const environment = resolveCraftEnvironment({
      installedApplications: [regularCraftApp],
      preferredApplication: regularCraftApp,
      supportPath: "/tmp/raycast-support",
      homeDirectory: "/Users/test",
      fileExists: () => false,
    });

    expect(environment.status).toBe("missing-data-root");
    expect(environment).toMatchObject({
      bundleId: supportedCraftBundleIds[0],
      application: regularCraftApp,
    });
  });

  it("returns missing-search-index when the Craft data root exists but Search does not", () => {
    const expectedPaths = buildCraftPaths({
      bundleId: supportedCraftBundleIds[0],
      homeDirectory: "/Users/test",
      supportPath: "/tmp/raycast-support",
    });

    const environment = resolveCraftEnvironment({
      installedApplications: [regularCraftApp],
      preferredApplication: regularCraftApp,
      supportPath: "/tmp/raycast-support",
      homeDirectory: "/Users/test",
      fileExists: (targetPath) => targetPath === expectedPaths.dataRoot,
    });

    expect(environment).toEqual({
      status: "missing-search-index",
      application: regularCraftApp,
      bundleId: supportedCraftBundleIds[0],
      ...expectedPaths,
    });
  });
});
