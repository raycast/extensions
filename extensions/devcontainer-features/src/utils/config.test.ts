import { describe, expect, it } from "vitest";
import type { CollectionInfo, Feature } from "../types";
import { generateFullConfiguration, generateUsageJson } from "./config";

const mockCollection: CollectionInfo = {
  sourceInformation: "devcontainers/features",
  ociReference: "ghcr.io/devcontainers/features",
};

const createMockFeature = (overrides: Partial<Feature> = {}): Feature => ({
  id: "python",
  name: "Python",
  reference: "ghcr.io/devcontainers/features/python:1",
  description: "Installs Python",
  collection: mockCollection,
  ...overrides,
});

describe("generateFullConfiguration", () => {
  it("generates config with no options", () => {
    const feature = createMockFeature();
    const config = generateFullConfiguration(feature);
    const parsed = JSON.parse(config);

    expect(parsed.features["ghcr.io/devcontainers/features/python:1"]).toEqual(
      {},
    );
  });

  it("generates config with default values", () => {
    const feature = createMockFeature({
      options: {
        version: { type: "string", default: "3.10" },
        installTools: { type: "boolean", default: true },
      },
    });
    const config = generateFullConfiguration(feature);
    const parsed = JSON.parse(config);

    expect(parsed.features["ghcr.io/devcontainers/features/python:1"]).toEqual({
      version: "3.10",
      installTools: true,
    });
  });

  it("uses first enum value when no default", () => {
    const feature = createMockFeature({
      options: {
        variant: { type: "enum", enum: ["alpine", "debian", "ubuntu"] },
      },
    });
    const config = generateFullConfiguration(feature);
    const parsed = JSON.parse(config);

    expect(
      parsed.features["ghcr.io/devcontainers/features/python:1"].variant,
    ).toBe("alpine");
  });

  it("uses true for boolean without default", () => {
    const feature = createMockFeature({
      options: {
        enableFeature: { type: "boolean" },
      },
    });
    const config = generateFullConfiguration(feature);
    const parsed = JSON.parse(config);

    expect(
      parsed.features["ghcr.io/devcontainers/features/python:1"].enableFeature,
    ).toBe(true);
  });

  it("uses empty string for string without default", () => {
    const feature = createMockFeature({
      options: {
        customPath: { type: "string" },
      },
    });
    const config = generateFullConfiguration(feature);
    const parsed = JSON.parse(config);

    expect(
      parsed.features["ghcr.io/devcontainers/features/python:1"].customPath,
    ).toBe("");
  });

  it("handles mixed option types", () => {
    const feature = createMockFeature({
      options: {
        version: { type: "string", default: "3.10" },
        variant: { type: "enum", enum: ["alpine", "debian"] },
        installTools: { type: "boolean", default: false },
        customPath: { type: "string" },
      },
    });
    const config = generateFullConfiguration(feature);
    const parsed = JSON.parse(config);

    const opts = parsed.features["ghcr.io/devcontainers/features/python:1"];
    expect(opts.version).toBe("3.10");
    expect(opts.variant).toBe("alpine");
    expect(opts.installTools).toBe(false);
    expect(opts.customPath).toBe("");
  });
});

describe("generateUsageJson", () => {
  it("generates basic usage JSON", () => {
    const feature = createMockFeature();
    const json = generateUsageJson(feature);
    const parsed = JSON.parse(json);

    expect(parsed.features["ghcr.io/devcontainers/features/python:1"]).toEqual(
      {},
    );
  });

  it("handles different references", () => {
    const feature = createMockFeature({
      reference: "ghcr.io/custom/features/node:2",
    });
    const json = generateUsageJson(feature);
    const parsed = JSON.parse(json);

    expect(parsed.features["ghcr.io/custom/features/node:2"]).toEqual({});
  });
});
