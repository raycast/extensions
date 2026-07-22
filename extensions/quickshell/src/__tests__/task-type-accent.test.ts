import { describe, expect, it } from "vitest";
import { suggestionPillIcon } from "../lib/task-type-accent";

describe("suggestionPillIcon", () => {
  it("maps known task types to distinct accents", () => {
    expect(suggestionPillIcon("agent")).toEqual({
      source: "speech-bubble-16",
      tintColor: "raycast-purple",
    });
    expect(suggestionPillIcon("test")).toEqual({
      source: "check-circle-16",
      tintColor: "raycast-yellow",
    });
    expect(suggestionPillIcon("api")).toEqual({
      source: "globe-01-16",
      tintColor: "raycast-blue",
    });
    expect(suggestionPillIcon("build")).toEqual({
      source: "hammer-16",
      tintColor: "raycast-orange",
    });
  });

  it("falls back for unknown types", () => {
    expect(suggestionPillIcon("none")).toEqual({
      source: "light-bulb-16",
      tintColor: "raycast-secondary-text",
    });
    expect(suggestionPillIcon(undefined)).toEqual({
      source: "light-bulb-16",
      tintColor: "raycast-secondary-text",
    });
  });
});
