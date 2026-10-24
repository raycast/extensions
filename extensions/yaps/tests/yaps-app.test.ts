import { describe, expect, test } from "bun:test";
import { selectYapsApplication } from "../src/lib/yaps-app-core";

describe("selectYapsApplication", () => {
  test("prefers the production bundle identifier wherever the app is installed", () => {
    const applications = [
      { name: "Yaps", path: "/Applications/Another Yaps.app", bundleId: "example.yaps" },
      {
        name: "Yaps Preview",
        path: "/Users/test/Applications/Yaps.app",
        bundleId: "com.yaps.app",
      },
    ];

    expect(selectYapsApplication(applications)?.path).toBe("/Users/test/Applications/Yaps.app");
    expect(selectYapsApplication([...applications].reverse())?.path).toBe("/Users/test/Applications/Yaps.app");
  });

  test("falls back to an exact application name for older builds", () => {
    const applications = [
      { name: "YAPS", path: "/Users/test/Applications/Yaps.app" },
      { name: "Yaps", path: "/Applications/Yaps.app" },
      { name: "Yaps Beta", path: "/Applications/Yaps Beta.app" },
    ];

    expect(selectYapsApplication(applications)?.path).toBe("/Applications/Yaps.app");
    expect(selectYapsApplication([...applications].reverse())?.path).toBe("/Applications/Yaps.app");
  });

  test("recognizes the shipped Setapp bundle identifier", () => {
    expect(
      selectYapsApplication([
        {
          name: "Yaps",
          path: "/Applications/Setapp/Yaps.app",
          bundleId: "com.yaps.app-setapp",
        },
      ])?.path,
    ).toBe("/Applications/Setapp/Yaps.app");
  });

  test("does not mistake similarly named applications for Yaps", () => {
    expect(
      selectYapsApplication([
        { name: "Yaps Beta", path: "/Applications/Yaps Beta.app" },
        { name: "Yaps Helper", path: "/Applications/Yaps Helper.app" },
        { name: "Notes", path: "/Applications/Notes.app" },
      ]),
    ).toBeUndefined();
  });
});
