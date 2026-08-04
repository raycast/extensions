import { describe, expect, it } from "vitest";
import { filterAvailableModels } from "./model-availability-core";

describe("model route availability", () => {
  const models = [{ id: "gemini-3-flash" }, { id: "gpt-5.6-luna" }];

  it("temporarily hides models rejected by the relay route", () => {
    expect(
      filterAvailableModels(models, { "gpt-5.6-luna": 1_000 }, 1_000 + 30_000),
    ).toEqual([{ id: "gemini-3-flash" }]);
  });

  it("restores rejected models after one hour", () => {
    expect(
      filterAvailableModels(
        models,
        { "gpt-5.6-luna": 1_000 },
        1_000 + 3_600_001,
      ),
    ).toEqual(models);
  });
});
