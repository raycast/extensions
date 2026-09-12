import { describe, expect, it } from "@jest/globals";
import { groupModelsByTier } from "./model-utils";

const models = (...names: string[]) => names.map((model) => ({ model }));

describe("groupModelsByTier", () => {
  it.each<{ model: string; tier: string }>([
    { model: "claude-fable-5", tier: "Frontier" },
    { model: "claude-mythos-5", tier: "Frontier" },
    { model: "claude-opus-4-7", tier: "Premium" },
    { model: "claude-sonnet-4-5", tier: "Standard" },
    { model: "claude-haiku-4-5", tier: "Fast" },
    { model: "some-other-model", tier: "Unknown" },
  ])("groups $model into $tier", ({ model, tier }) => {
    expect(groupModelsByTier(models(model))).toEqual({ [tier]: [{ model }] });
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
