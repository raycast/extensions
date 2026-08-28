import { describe, expect, it } from "@jest/globals";
import { groupModelsByTier } from "./model-utils";

const models = (...names: string[]) => names.map((model) => ({ model }));

describe("groupModelsByTier", () => {
  it("groups Fable and Mythos into Frontier", () => {
    const grouped = groupModelsByTier(models("claude-fable-5", "claude-mythos-5"));

    expect(grouped.Frontier.map((entry) => entry.model)).toEqual(["claude-fable-5", "claude-mythos-5"]);
  });

  it("keeps the existing Opus, Sonnet, and Haiku tiers", () => {
    const grouped = groupModelsByTier(models("claude-opus-4-7", "claude-sonnet-4-5", "claude-haiku-4-5"));

    expect(grouped.Premium.map((entry) => entry.model)).toEqual(["claude-opus-4-7"]);
    expect(grouped.Standard.map((entry) => entry.model)).toEqual(["claude-sonnet-4-5"]);
    expect(grouped.Fast.map((entry) => entry.model)).toEqual(["claude-haiku-4-5"]);
  });

  it("puts an unrecognized model in Unknown", () => {
    const grouped = groupModelsByTier(models("some-other-model"));

    expect(grouped.Unknown.map((entry) => entry.model)).toEqual(["some-other-model"]);
  });

  it("orders tiers from Frontier to Unknown regardless of input order", () => {
    const grouped = groupModelsByTier(
      models("some-other-model", "claude-haiku-4-5", "claude-sonnet-4-5", "claude-opus-4-7", "claude-fable-5"),
    );

    expect(Object.keys(grouped)).toEqual(["Frontier", "Premium", "Standard", "Fast", "Unknown"]);
  });

  it("omits tiers with no models", () => {
    const grouped = groupModelsByTier(models("claude-fable-5", "claude-haiku-4-5"));

    expect(Object.keys(grouped)).toEqual(["Frontier", "Fast"]);
  });
});
