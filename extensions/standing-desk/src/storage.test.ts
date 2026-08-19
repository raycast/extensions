import { beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.hoisted(() => new Map<string, string>());
const logDiagnostic = vi.hoisted(() => vi.fn());
const deskA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const deskB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn((key: string) => values.get(key)),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  },
}));

vi.mock("./diagnostics", () => ({ logDiagnostic }));

import {
  acknowledgeSafety,
  forgetDeskIdentifier,
  getCachedDeskStatus,
  getConfiguration,
  getDeskSelection,
  getPresets,
  hasAcknowledgedSafety,
  restoreDefaultSettings,
  saveCachedDeskStatus,
  saveConfiguration,
  savePreset,
  selectDeskIdentifier,
} from "./storage";

describe("standing desk storage", () => {
  beforeEach(() => {
    values.clear();
    logDiagnostic.mockClear();
  });

  it("uses safe defaults when settings have not been saved", async () => {
    await expect(getConfiguration()).resolves.toEqual({
      deskName: "Desk",
      baseHeight: 62,
      minimumHeight: 62,
      maximumHeight: 127,
      stepHeight: 1,
    });
    await expect(getPresets()).resolves.toEqual({ sit: 70, stand: 110 });
  });

  it("clears malformed current and legacy desk identifiers", async () => {
    values.set(
      "desk.selection",
      JSON.stringify({ identifier: "not-a-uuid", token: "selection-token" }),
    );
    await expect(getDeskSelection()).resolves.toBeUndefined();
    expect(values.has("desk.selection")).toBe(false);

    values.set("desk.identifier", "still-not-a-uuid");
    await expect(getDeskSelection()).resolves.toBeUndefined();
    expect(values.has("desk.identifier")).toBe(false);
  });

  it("fails closed when saved calibration is invalid", async () => {
    await selectDeskIdentifier(deskA);
    const selection = await getDeskSelection();
    await acknowledgeSafety(selection!.token);
    values.set(`desk.status.${selection!.token}`, "cached-status");
    values.set(
      "desk.configuration",
      JSON.stringify({
        deskName: "Desk",
        baseHeight: 70,
        minimumHeight: 62,
        maximumHeight: 127,
        stepHeight: 1,
      }),
    );

    await expect(getConfiguration()).resolves.toMatchObject({
      baseHeight: 62,
      minimumHeight: 62,
    });
    expect(logDiagnostic).toHaveBeenCalledWith(
      "warning",
      "settings.invalid-restored",
      expect.objectContaining({
        message: "Base Height cannot exceed Minimum Height.",
      }),
    );
    await expect(getDeskSelection()).resolves.toBeUndefined();
    await expect(hasAcknowledgedSafety()).resolves.toBe(false);
    expect(values.has(`desk.status.${selection!.token}`)).toBe(false);
  });

  it("restores defaults and requires the desk to be selected again", async () => {
    await saveConfiguration({
      deskName: "Office",
      baseHeight: 64,
      minimumHeight: 64,
      maximumHeight: 125,
      stepHeight: 2,
    });
    await savePreset("sit", 75);
    await savePreset("stand", 105);
    await selectDeskIdentifier(deskA);

    await expect(restoreDefaultSettings()).resolves.toEqual({
      configuration: {
        deskName: "Desk",
        baseHeight: 62,
        minimumHeight: 62,
        maximumHeight: 127,
        stepHeight: 1,
      },
      presets: { sit: 70, stand: 110 },
    });
    await expect(getDeskSelection()).resolves.toBeUndefined();
  });

  it("stores a safe last-known desk status without the Bluetooth identifier", async () => {
    await selectDeskIdentifier(deskA);
    const selection = await getDeskSelection();
    await saveCachedDeskStatus(
      {
        heightCm: 109.8,
        deskName: "Desk 1234",
        updatedAt: 1_775_000_000_000,
      },
      selection!.token,
    );

    await expect(getCachedDeskStatus()).resolves.toEqual({
      heightCm: 109.8,
      deskName: "Desk 1234",
      updatedAt: 1_775_000_000_000,
    });
    expect(values.get(`desk.status.${selection!.token}`)).not.toContain(deskA);
  });

  it("ignores an invalid cached desk status", async () => {
    values.set(
      "desk.status",
      JSON.stringify({ heightCm: "unknown", updatedAt: Date.now() }),
    );

    await expect(getCachedDeskStatus()).resolves.toBeUndefined();
  });

  it("clears the cached height when the selected desk changes", async () => {
    await selectDeskIdentifier(deskA);
    const oldSelection = await getDeskSelection();
    values.set(`desk.status.${oldSelection!.token}`, "cached-status");

    await selectDeskIdentifier(deskB);

    await expect(getDeskSelection()).resolves.toMatchObject({
      identifier: deskB,
    });
    expect(values.has(`desk.status.${oldSelection!.token}`)).toBe(false);
  });

  it("keeps the cached height when the selected desk does not change", async () => {
    await selectDeskIdentifier(deskA);
    const originalSelection = await getDeskSelection();
    values.set(`desk.status.${originalSelection!.token}`, "cached-status");

    await selectDeskIdentifier(deskA);

    expect(values.get(`desk.status.${originalSelection!.token}`)).toBe(
      "cached-status",
    );
    await expect(getDeskSelection()).resolves.toEqual(originalSelection);
  });

  it("ignores cached events from an older desk selection", async () => {
    await selectDeskIdentifier(deskA);
    const selectionA = await getDeskSelection();
    await selectDeskIdentifier(deskB);
    await saveCachedDeskStatus(
      { heightCm: 90, deskName: "Desk A", updatedAt: 123 },
      selectionA!.token,
    );

    await expect(getCachedDeskStatus()).resolves.toBeUndefined();
    await expect(getDeskSelection()).resolves.toMatchObject({
      identifier: deskB,
    });
  });

  it("does not let an older desk event replace the current desk cache", async () => {
    await selectDeskIdentifier(deskA);
    const selectionA = await getDeskSelection();
    await selectDeskIdentifier(deskB);
    const selectionB = await getDeskSelection();
    await saveCachedDeskStatus(
      { heightCm: 100, deskName: "Desk B", updatedAt: 200 },
      selectionB!.token,
    );

    await saveCachedDeskStatus(
      { heightCm: 90, deskName: "Desk A", updatedAt: 300 },
      selectionA!.token,
    );

    await expect(getCachedDeskStatus()).resolves.toEqual({
      heightCm: 100,
      deskName: "Desk B",
      updatedAt: 200,
    });
  });

  it("scopes the safety acknowledgement to one desk selection", async () => {
    await selectDeskIdentifier(deskA);
    const selectionA = await getDeskSelection();
    await acknowledgeSafety(selectionA!.token);
    await expect(hasAcknowledgedSafety(selectionA!.token)).resolves.toBe(true);

    await selectDeskIdentifier(deskB);
    await expect(hasAcknowledgedSafety()).resolves.toBe(false);
    await expect(hasAcknowledgedSafety(selectionA!.token)).resolves.toBe(false);
  });

  it("clears all desk-bound state when the desk is forgotten", async () => {
    await selectDeskIdentifier(deskA);
    const selection = await getDeskSelection();
    await acknowledgeSafety(selection!.token);
    await saveCachedDeskStatus(
      { heightCm: 80, updatedAt: 123 },
      selection!.token,
    );

    await forgetDeskIdentifier();

    await expect(getDeskSelection()).resolves.toBeUndefined();
    await expect(getCachedDeskStatus()).resolves.toBeUndefined();
    await expect(hasAcknowledgedSafety()).resolves.toBe(false);
  });
});
