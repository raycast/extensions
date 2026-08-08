import { beforeEach, describe, expect, it } from "vitest";
import { clearProviders, findProviderForBundle, getProviders, registerProvider } from "../../src/core/registry";
import type { SourceProvider } from "../../src/core/types";

function fake(id: string, bundleIds: string[]): SourceProvider {
  return {
    id,
    displayName: id,
    bundleIds,
    capabilities: { control: false, artwork: false, seek: false },
    isAvailable: async () => true,
    getSource: async () => null,
  };
}

beforeEach(clearProviders);

describe("registry", () => {
  it("registers and lists in order", () => {
    registerProvider(fake("a", []));
    registerProvider(fake("b", []));
    expect(getProviders().map((p) => p.id)).toEqual(["a", "b"]);
  });
  it("finds provider by bundle id", () => {
    registerProvider(fake("music", ["com.apple.Music"]));
    expect(findProviderForBundle("com.apple.Music")?.id).toBe("music");
    expect(findProviderForBundle("com.spotify.client")).toBeUndefined();
  });
  it("ignores duplicate ids", () => {
    registerProvider(fake("a", []));
    registerProvider(fake("a", []));
    expect(getProviders()).toHaveLength(1);
  });
});
