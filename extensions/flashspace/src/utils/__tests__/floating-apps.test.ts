import { describe, expect, it } from "vitest";
import { getUndoFloatingAction } from "../floating-apps";

describe("floating app helpers", () => {
  it("BUG 6: should offer float as the undo action for toggle", () => {
    expect(getUndoFloatingAction("toggle")).toBe("float");
  });

  it("should offer float as the undo action for unfloat", () => {
    expect(getUndoFloatingAction("unfloat")).toBe("float");
  });

  it("should offer unfloat as the undo action for float", () => {
    expect(getUndoFloatingAction("float")).toBe("unfloat");
  });
});
