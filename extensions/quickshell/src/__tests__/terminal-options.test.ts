import { describe, expect, it } from "vitest";
import { getDefaultProfileChoices, normalizeDefaultProfile } from "../lib/terminal-options";

describe("terminal-options", () => {
  it("returns wt profiles for windows terminal defaults", () => {
    const choices = getDefaultProfileChoices("wt");
    expect(choices.some((choice) => choice.id === "PowerShell")).toBe(true);
  });

  it("falls back to default profile sentinel for unknown values", () => {
    expect(normalizeDefaultProfile("conhost", "unknown")).toBe("__default__");
  });
});
