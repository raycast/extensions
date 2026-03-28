import { expect, test } from "vitest";
import { getMenuBarPresentation } from "../src/lib/menu-bar-presentation";

test("getMenuBarPresentation maps enabled to on presentation", () => {
  expect(getMenuBarPresentation({ enabled: true })).toEqual({
    tooltip: "Peon Ping is on",
    iconToken: "peonOn",
  });
});

test("getMenuBarPresentation maps disabled to off presentation", () => {
  expect(getMenuBarPresentation({ enabled: false })).toEqual({
    tooltip: "Peon Ping is off",
    iconToken: "peonOff",
  });
});
