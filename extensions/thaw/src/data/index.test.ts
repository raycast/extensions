import { describe, expect, it } from "vitest";
import { DIRECT_THAW_ACTIONS, getThawAction, SETTINGS_THAW_ACTIONS, THAW_ACTIONS, type ThawActionId } from "./index";

describe("THAW_ACTIONS", () => {
  it("keeps direct and settings actions partitioned", () => {
    expect(DIRECT_THAW_ACTIONS.every((action) => action.section === "actions")).toBe(true);
    expect(SETTINGS_THAW_ACTIONS.every((action) => action.section === "settings")).toBe(true);
    expect(THAW_ACTIONS).toHaveLength(DIRECT_THAW_ACTIONS.length + SETTINGS_THAW_ACTIONS.length);
  });

  it("marks only settings actions as requiring Settings URI", () => {
    for (const action of DIRECT_THAW_ACTIONS) {
      expect(action.requiresSettingsURI).toBeFalsy();
    }
    for (const action of SETTINGS_THAW_ACTIONS) {
      expect(action.requiresSettingsURI).toBe(true);
    }
  });

  it("looks up actions by command id", () => {
    expect(getThawAction("toggle-hidden")).toMatchObject({
      action: "toggle-hidden",
      section: "actions",
    });
    expect(getThawAction("toggle-auto-rehide")).toMatchObject({
      action: "toggle",
      query: { key: "autoRehide" },
      requiresSettingsURI: true,
    });
  });

  it("throws for unknown ids", () => {
    expect(() => getThawAction("missing" as ThawActionId)).toThrow("Unknown Thaw action: missing");
  });

  it("does not expose the redundant useIceBar settings toggle", () => {
    expect(THAW_ACTIONS.some((action) => action.query?.key === "useIceBar")).toBe(false);
    expect(THAW_ACTIONS.some((action) => action.id === "toggle-thawbar")).toBe(true);
  });
});
