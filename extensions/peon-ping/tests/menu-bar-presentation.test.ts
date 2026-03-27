import { expect, test } from "vitest";
import { getMenuBarPresentation } from "../src/lib/menu-bar-presentation";

test("getMenuBarPresentation returns null when showMenuBarIcon is false", () => {
  expect(
    getMenuBarPresentation({ showMenuBarIcon: false, enabled: true }),
  ).toBeNull();
  expect(
    getMenuBarPresentation({ showMenuBarIcon: false, enabled: false }),
  ).toBeNull();
});

test("getMenuBarPresentation maps enabled to on presentation", () => {
  expect(
    getMenuBarPresentation({ showMenuBarIcon: true, enabled: true }),
  ).toEqual({
    title: "Peon Ping",
    tooltip: "Peon Ping is on",
    iconToken: "on",
  });
});

test("getMenuBarPresentation maps disabled to off presentation", () => {
  expect(
    getMenuBarPresentation({ showMenuBarIcon: true, enabled: false }),
  ).toEqual({
    title: "Peon Ping",
    tooltip: "Peon Ping is off",
    iconToken: "off",
  });
});
