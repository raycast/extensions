import { describe, expect, it } from "vitest";
import { reflowOutcome } from "../src/lib/reflow-outcome";

describe("reflowOutcome", () => {
  it("returns empty when there is no input", () => {
    expect(reflowOutcome(null)).toEqual({ status: "empty" });
    expect(reflowOutcome("")).toEqual({ status: "empty" });
    expect(reflowOutcome("   ")).toEqual({ status: "empty" });
  });

  it("rejects plain wrapped prose", () => {
    expect(reflowOutcome("This is a wrapped paragraph\nwith no markdown markers.")).toEqual({
      status: "not-markdown",
    });
  });

  it("returns already-clean when nothing changes", () => {
    const text = "- One\n- Two";
    expect(reflowOutcome(text)).toEqual({ status: "already-clean", text, original: text });
  });

  it("returns the joined markdown when wraps are present", () => {
    const input = "- OpenAI returns 400 because the item\n  was provided without a follow-up.\n- Second item";
    const result = reflowOutcome(input);
    expect(result.status).toBe("reflowed");
    if (result.status !== "reflowed") return;
    expect(result.text).toBe("- OpenAI returns 400 because the item was provided without a follow-up.\n- Second item");
  });
});
