import { describe, expect, it } from "vitest";
import { getCameraDisplayName } from "../constants";

describe("constants", () => {
  it("maps known camera names", () => {
    expect(getCameraDisplayName("front")).toBe("Front");
    expect(getCameraDisplayName("left_repeater")).toBe("Left Repeater");
  });

  it("title-cases unknown camera names", () => {
    expect(getCameraDisplayName("custom_camera")).toBe("Custom Camera");
  });
});
