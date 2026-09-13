import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionEnterAction } from "../src/lib/preferences";

const preferences: { sessionEnterAction?: string } = {};
vi.mock("@raycast/api", () => ({ getPreferenceValues: () => preferences }));

beforeEach(() => {
  preferences.sessionEnterAction = undefined;
});

describe("getSessionEnterAction", () => {
  it("keeps attach as the Enter action unless switch is chosen", () => {
    expect(getSessionEnterAction()).toBe("attach");
    preferences.sessionEnterAction = "switch";
    expect(getSessionEnterAction()).toBe("switch");
    preferences.sessionEnterAction = "anything-else";
    expect(getSessionEnterAction()).toBe("attach");
  });
});
