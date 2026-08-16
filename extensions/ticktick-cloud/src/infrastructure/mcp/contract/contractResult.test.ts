import { describe, expect, it } from "vitest";
import { CONTRACT_ENVIRONMENT_ERROR, readContractEnvironment } from "./contractResult";

describe("readContractEnvironment", () => {
  it("fails with the exact safe instruction when any credential input is missing", () => {
    expect(() => readContractEnvironment({})).toThrowError(CONTRACT_ENVIRONMENT_ERROR);
    expect(() =>
      readContractEnvironment({
        TICKTICK_CONTRACT_TOKEN: "token-not-printed",
        TICKTICK_CONTRACT_SOURCE_PROJECT_ID: "source",
      })
    ).toThrowError(CONTRACT_ENVIRONMENT_ERROR);
  });

  it("trims all inputs and requires two distinct project IDs", () => {
    expect(
      readContractEnvironment({
        TICKTICK_CONTRACT_TOKEN: "  token-not-printed  ",
        TICKTICK_CONTRACT_SOURCE_PROJECT_ID: "  source  ",
        TICKTICK_CONTRACT_TARGET_PROJECT_ID: "  target  ",
      })
    ).toEqual({ token: "token-not-printed", sourceProjectId: "source", targetProjectId: "target" });

    expect(() =>
      readContractEnvironment({
        TICKTICK_CONTRACT_TOKEN: "token-not-printed",
        TICKTICK_CONTRACT_SOURCE_PROJECT_ID: "same",
        TICKTICK_CONTRACT_TARGET_PROJECT_ID: " same ",
      })
    ).toThrowError("Use two different TickTick projects for the authenticated contract suite.");
  });
});
