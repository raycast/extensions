import { describe, expect, it } from "vitest";
import type { CollectionInfo, Feature } from "../types";
import {
  getCollectionName,
  getFeatureCollectionName,
  getFeatureGitHubUrl,
  getGitHubRepoUrl,
  isOfficialCollection,
  isOfficialFeature,
  isValidDocumentationUrl,
  sortFeatures,
} from "./collection";

const mockCollection: CollectionInfo = {
  sourceInformation: "devcontainers/features",
  ociReference: "ghcr.io/devcontainers/features",
};

const mockThirdPartyCollection: CollectionInfo = {
  sourceInformation: "someuser/my-features",
  ociReference: "ghcr.io/someuser/my-features",
};

const mockFeature: Feature = {
  id: "python",
  name: "Python",
  reference: "ghcr.io/devcontainers/features/python:1",
  description: "Installs Python",
  collection: mockCollection,
};

const mockThirdPartyFeature: Feature = {
  id: "custom",
  name: "Custom Feature",
  reference: "ghcr.io/someuser/my-features/custom:1",
  description: "A custom feature",
  collection: mockThirdPartyCollection,
};

describe("getCollectionName", () => {
  it("extracts collection name from OCI reference", () => {
    expect(getCollectionName(mockCollection)).toBe("devcontainers/features");
  });

  it("handles non-ghcr references", () => {
    const collection: CollectionInfo = {
      sourceInformation: "test/repo",
      ociReference: "other-registry.io/test/repo",
    };
    expect(getCollectionName(collection)).toBe("other-registry.io/test/repo");
  });

  it("returns empty string for invalid collection", () => {
    // @ts-expect-error Testing invalid input
    expect(getCollectionName(null)).toBe("");
    // @ts-expect-error Testing invalid input
    expect(getCollectionName({})).toBe("");
    // @ts-expect-error Testing invalid input
    expect(getCollectionName({ sourceInformation: "" })).toBe("");
  });
});

describe("getFeatureCollectionName", () => {
  it("returns collection name from feature", () => {
    expect(getFeatureCollectionName(mockFeature)).toBe(
      "devcontainers/features",
    );
  });

  it("returns empty string for invalid feature", () => {
    // @ts-expect-error Testing invalid input
    expect(getFeatureCollectionName(null)).toBe("");
    // @ts-expect-error Testing invalid input
    expect(getFeatureCollectionName({ id: "test" })).toBe("");
  });
});

describe("isOfficialCollection", () => {
  it("returns true for official devcontainers collection", () => {
    expect(isOfficialCollection(mockCollection)).toBe(true);
  });

  it("returns false for third-party collection", () => {
    expect(isOfficialCollection(mockThirdPartyCollection)).toBe(false);
  });

  it("returns false for invalid collection", () => {
    // @ts-expect-error Testing invalid input
    expect(isOfficialCollection(null)).toBe(false);
    // @ts-expect-error Testing invalid input
    expect(isOfficialCollection({})).toBe(false);
  });
});

describe("isOfficialFeature", () => {
  it("returns true for official feature", () => {
    expect(isOfficialFeature(mockFeature)).toBe(true);
  });

  it("returns false for third-party feature", () => {
    expect(isOfficialFeature(mockThirdPartyFeature)).toBe(false);
  });

  it("returns false for invalid feature", () => {
    // @ts-expect-error Testing invalid input
    expect(isOfficialFeature(null)).toBe(false);
    // @ts-expect-error Testing invalid input
    expect(isOfficialFeature({ id: "test" })).toBe(false);
  });
});

describe("sortFeatures", () => {
  it("sorts official features before third-party", () => {
    const features = [mockThirdPartyFeature, mockFeature];
    const sorted = sortFeatures(features);

    expect(sorted[0].id).toBe("python");
    expect(sorted[1].id).toBe("custom");
  });

  it("sorts alphabetically within same category", () => {
    const feature1: Feature = { ...mockFeature, id: "node", name: "Node.js" };
    const feature2: Feature = { ...mockFeature, id: "python", name: "Python" };
    const features = [feature2, feature1];

    const sorted = sortFeatures(features);
    expect(sorted[0].name).toBe("Node.js");
    expect(sorted[1].name).toBe("Python");
  });

  it("does not mutate original array", () => {
    const features = [mockThirdPartyFeature, mockFeature];
    const originalFirst = features[0];
    sortFeatures(features);
    expect(features[0]).toBe(originalFirst);
  });

  it("returns empty array for invalid input", () => {
    // @ts-expect-error Testing invalid input
    expect(sortFeatures(null)).toEqual([]);
    // @ts-expect-error Testing invalid input
    expect(sortFeatures(undefined)).toEqual([]);
    // @ts-expect-error Testing invalid input
    expect(sortFeatures("not an array")).toEqual([]);
  });

  it("filters out invalid features", () => {
    const features = [mockFeature, { id: "invalid" }, mockThirdPartyFeature];
    // @ts-expect-error Testing mixed data
    const sorted = sortFeatures(features);

    expect(sorted).toHaveLength(2);
    expect(sorted[0].id).toBe("python");
    expect(sorted[1].id).toBe("custom");
  });
});

describe("getGitHubRepoUrl", () => {
  it("generates correct GitHub URL", () => {
    expect(getGitHubRepoUrl("devcontainers/features")).toBe(
      "https://github.com/devcontainers/features",
    );
  });

  it("returns empty string for invalid input", () => {
    expect(getGitHubRepoUrl("")).toBe("");
    // @ts-expect-error Testing invalid input
    expect(getGitHubRepoUrl(null)).toBe("");
    // @ts-expect-error Testing invalid input
    expect(getGitHubRepoUrl(undefined)).toBe("");
  });
});

describe("getFeatureGitHubUrl", () => {
  it("returns GitHub URL for feature", () => {
    expect(getFeatureGitHubUrl(mockFeature)).toBe(
      "https://github.com/devcontainers/features",
    );
  });

  it("returns empty string for invalid feature", () => {
    // @ts-expect-error Testing invalid input
    expect(getFeatureGitHubUrl(null)).toBe("");
    // @ts-expect-error Testing invalid input
    expect(getFeatureGitHubUrl({ id: "test" })).toBe("");
  });
});

describe("isValidDocumentationUrl", () => {
  it("returns true for valid https URL", () => {
    expect(isValidDocumentationUrl("https://example.com/docs")).toBe(true);
  });

  it("returns true for valid http URL", () => {
    expect(isValidDocumentationUrl("http://example.com/docs")).toBe(true);
  });

  it("returns false for invalid protocols", () => {
    expect(isValidDocumentationUrl("ftp://example.com")).toBe(false);
    expect(isValidDocumentationUrl("file:///path/to/file")).toBe(false);
    expect(isValidDocumentationUrl("javascript:alert(1)")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isValidDocumentationUrl("not a url")).toBe(false);
    expect(isValidDocumentationUrl("")).toBe(false);
    expect(isValidDocumentationUrl(undefined)).toBe(false);
  });
});
