import { describe, expect, it } from "vitest";
import { resolveCaptureChoice } from "./capture-choice";
import type { ChoiceSummary } from "./types";

const choice = (
  id: string,
  name: string,
  type: ChoiceSummary["type"] = "Capture",
): ChoiceSummary => ({
  id,
  name,
  type,
  command: false,
  path: name,
  runnable: type !== "Multi",
});

describe("resolveCaptureChoice", () => {
  it("returns the one choice with that name", () => {
    expect(
      resolveCaptureChoice(
        [choice("a", "Inbox"), choice("b", "Journal")],
        "Inbox",
      ).id,
    ).toBe("a");
  });

  it("prefers the Capture when a Template shares the name", () => {
    const choices = [choice("t", "Inbox", "Template"), choice("c", "Inbox")];
    expect(resolveCaptureChoice(choices, "Inbox").id).toBe("c");
  });

  it("refuses two Captures with the same name instead of guessing", () => {
    const choices = [choice("x", "Inbox"), choice("y", "Inbox")];
    expect(() => resolveCaptureChoice(choices, "Inbox")).toThrow(/Several/);
  });

  it("names the missing choice", () => {
    expect(() => resolveCaptureChoice([choice("a", "Inbox")], "Nope")).toThrow(
      /"Nope"/,
    );
  });

  it("ignores a Multi folder that shares the name", () => {
    const choices = [choice("m", "Inbox", "Multi"), choice("c", "Inbox")];
    expect(resolveCaptureChoice(choices, "Inbox").id).toBe("c");
  });
});
