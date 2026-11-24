import { describe, expect, it } from "vitest";
import { shouldRestart } from "../keepalive";

const high = { all: 1.5625, levels: {} };

describe("shouldRestart", () => {
  it("does nothing when the preference is off", () => {
    expect(shouldRestart({ restoreAfterRestart: false, running: false, wanted: high })).toBe(false);
  });
  it("does nothing while the helper is running", () => {
    expect(shouldRestart({ restoreAfterRestart: true, running: true, wanted: high })).toBe(false);
  });
  it("never undoes an explicit Off", () => {
    expect(shouldRestart({ restoreAfterRestart: true, running: false, wanted: { all: 1, levels: { A: 1 } } })).toBe(
      false,
    );
  });
  it("does nothing when nothing was ever chosen", () => {
    expect(shouldRestart({ restoreAfterRestart: true, running: false, wanted: undefined })).toBe(false);
  });
  it("restarts when only one display's own level boosts", () => {
    expect(
      shouldRestart({ restoreAfterRestart: true, running: false, wanted: { all: 1, levels: { XDR: 1.375 } } }),
    ).toBe(true);
  });
});
