import { Icon } from "@raycast/api";
import { expect, test } from "vitest";
import { getMenuBarPresentation } from "../src/lib/menu-bar-presentation";

test("getMenuBarPresentation includes pause copy when enabled", () => {
  expect(getMenuBarPresentation({ enabled: true })).toEqual({
    tooltip: "Peon Ping is on",
    iconToken: "peonOn",
    toggleTitle: "Pause Peon Ping",
    toggleIcon: Icon.Pause,
  });
});

test("getMenuBarPresentation includes resume copy when disabled", () => {
  expect(getMenuBarPresentation({ enabled: false })).toEqual({
    tooltip: "Peon Ping is off",
    iconToken: "peonOff",
    toggleTitle: "Resume Peon Ping",
    toggleIcon: Icon.Play,
  });
});
