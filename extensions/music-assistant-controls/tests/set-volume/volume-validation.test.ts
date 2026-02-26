import { isValidVolumeInput } from "@/set-volume/volume-validation";

describe("set-volume/volume-validation", () => {
  it("accepts valid volume inputs", () => {
    expect(isValidVolumeInput("0")).toBe(true);
    expect(isValidVolumeInput("50")).toBe(true);
    expect(isValidVolumeInput("100")).toBe(true);
  });

  it("rejects invalid volume inputs", () => {
    expect(isValidVolumeInput("-1")).toBe(false);
    expect(isValidVolumeInput("101")).toBe(false);
    expect(isValidVolumeInput("abc")).toBe(false);
  });
});
