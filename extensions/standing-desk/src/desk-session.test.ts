import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => [] as string[]);
const cancelActiveMovement = vi.hoisted(() =>
  vi.fn(async () => {
    calls.push("cancel");
    return "request-id";
  }),
);
const saveSettings = vi.hoisted(() =>
  vi.fn(async () => {
    calls.push("save-settings");
  }),
);
const selectDeskIdentifier = vi.hoisted(() =>
  vi.fn(async () => {
    calls.push("select-desk");
  }),
);
const restoreDefaultSettings = vi.hoisted(() =>
  vi.fn(async () => {
    calls.push("restore-defaults");
    return {
      configuration: {
        deskName: "Desk",
        baseHeight: 62,
        minimumHeight: 62,
        maximumHeight: 127,
        stepHeight: 1,
      },
      presets: { sit: 70, stand: 110 },
    };
  }),
);
const forgetDeskIdentifier = vi.hoisted(() =>
  vi.fn(async () => {
    calls.push("forget-desk");
  }),
);

vi.mock("./native", () => ({ cancelActiveMovement }));
vi.mock("./storage", () => ({
  forgetDeskIdentifier,
  restoreDefaultSettings,
  saveSettings,
  selectDeskIdentifier,
}));

import {
  forgetDeskSession,
  restoreDefaultDeskSession,
  saveDeskSession,
} from "./desk-session";

const settings = {
  configuration: {
    deskName: "Desk",
    baseHeight: 62,
    minimumHeight: 62,
    maximumHeight: 127,
    stepHeight: 1,
  },
  presets: { sit: 70, stand: 110 },
};

describe("desk session mutations", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
  });

  it("stops movement before and after saving a selected desk", async () => {
    await saveDeskSession(settings, "desk-id");

    expect(calls).toEqual([
      "cancel",
      "forget-desk",
      "save-settings",
      "select-desk",
      "cancel",
    ]);
    expect(selectDeskIdentifier).toHaveBeenCalledWith("desk-id");
  });

  it("stops movement before and after restoring defaults", async () => {
    await restoreDefaultDeskSession();

    expect(calls).toEqual(["cancel", "restore-defaults", "cancel"]);
  });

  it("stops movement before and after forgetting the desk", async () => {
    await forgetDeskSession();

    expect(calls).toEqual(["cancel", "forget-desk", "cancel"]);
  });

  it("still sends a final stop when a mutation fails", async () => {
    saveSettings.mockRejectedValueOnce(new Error("save failed"));

    await expect(saveDeskSession(settings, "desk-id")).rejects.toThrow(
      "save failed",
    );
    expect(calls).toEqual(["cancel", "forget-desk", "cancel"]);
  });
});
