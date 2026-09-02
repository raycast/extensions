import { describe, expect, it } from "vitest";
import manifest from "../package.json";

describe("platform command availability", () => {
  it("supports both macOS and Windows", () => {
    expect(manifest.platforms).toEqual(["macOS", "Windows"]);
  });

  it("keeps Upcoming Flights cross-platform and the menu bar command macOS-only", () => {
    const windowsCommands = manifest.commands.filter(
      (command) => command.mode !== "menu-bar",
    );
    const macOSOnlyCommands = manifest.commands.filter(
      (command) => command.mode === "menu-bar",
    );

    expect(windowsCommands.map((command) => command.name)).toEqual([
      "upcoming-flights",
      "friends-upcoming-flights",
    ]);
    expect(macOSOnlyCommands.map((command) => command.name)).toEqual([
      "next-flight-in-menu-bar",
    ]);
  });
});
