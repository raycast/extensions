import type { Application } from "@raycast/api";
import { afterEach, describe, expect, it } from "vitest";
import { pickDawApp } from "@/core/daw-app";
import { daw } from "@/daws";
import { __setPreferences } from "./mocks/raycast-api";

// 应用名从适配器取，测试里不写死某个 DAW 的名字。
const appName = daw.appNameMatch;

const installed: Application = { name: appName, path: `/Applications/${appName}.app`, bundleId: "com.example.daw" };
const otherVersion: Application = {
  name: appName,
  path: `/Applications/${appName} 2.app`,
  bundleId: "com.example.daw.2",
};
const other: Application = { name: "Finder", path: "/System/Library/CoreServices/Finder.app", bundleId: "com.apple.finder" };

afterEach(() => {
  __setPreferences({});
});

describe("pickDawApp", () => {
  it("按 bundle ID 找到选的版本", () => {
    __setPreferences({ dawApp: "com.example.daw.2" });
    expect(pickDawApp([other, installed, otherVersion])).toEqual(otherVersion);
  });

  it("选的版本没装时，用装着的另一个版本", () => {
    __setPreferences({ dawApp: "com.example.daw.2" });
    expect(pickDawApp([other, installed])).toEqual(installed);
  });

  it("没设偏好时按名字找", () => {
    expect(pickDawApp([other, otherVersion])).toEqual(otherVersion);
  });

  it("一个都没装时为 null", () => {
    __setPreferences({ dawApp: "com.example.daw" });
    expect(pickDawApp([other])).toBeNull();
  });
});
