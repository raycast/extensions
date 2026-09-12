import { describe, expect, it, vi } from "vitest";
import {
  canDispatchToLayoutLock,
  CorruptLayoutIndexError,
  decodeLayoutIndex,
  developmentLayoutLockTarget,
  dispatchCaptureToCompatibleLayoutLock,
  dispatchToLayoutLock,
  isLayoutLockInstalled,
  layoutLockBundleID,
  layoutIndexPath,
  layoutIndexRecoveryMessage,
  layoutLockTarget,
  makeCaptureURL,
  makeOpenArguments,
  makeRestoreURL,
  MissingLayoutIndexError,
  productionLayoutLockTarget,
  UnsupportedLayoutIndexError,
} from "../src/layoutlock";

const layout = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Focus",
  updatedAt: "2026-08-09T12:00:00Z",
  windowCount: 4,
  appCount: 3,
  displayCount: 2,
};

describe("LayoutLock integration contract", () => {
  it("decodes the supported index and preserves ordering", () => {
    const second = { ...layout, id: "22222222-2222-4222-8222-222222222222", name: "Desk" };
    expect(decodeLayoutIndex({ schemaVersion: 1, layouts: [layout, second] }).layouts).toEqual([layout, second]);
  });

  it("rejects corrupt and unsupported indexes", () => {
    expect(() => decodeLayoutIndex({ schemaVersion: 2, layouts: [] })).toThrow(UnsupportedLayoutIndexError);
    expect(() => decodeLayoutIndex({ schemaVersion: 1, layouts: [{ ...layout, windowCount: -1 }] })).toThrow(
      CorruptLayoutIndexError,
    );
  });

  it("detects LayoutLock only by bundle identifier", () => {
    expect(isLayoutLockInstalled([{ bundleId: layoutLockBundleID }])).toBe(true);
    expect(
      isLayoutLockInstalled([{ bundleId: developmentLayoutLockTarget.bundleID }], developmentLayoutLockTarget),
    ).toBe(true);
    expect(isLayoutLockInstalled([{ bundleId: layoutLockBundleID }], developmentLayoutLockTarget)).toBe(false);
    expect(isLayoutLockInstalled([{ bundleId: "com.example.LayoutLock" }])).toBe(false);
  });

  it("selects an isolated development target", () => {
    expect(layoutLockTarget(false)).toEqual(productionLayoutLockTarget);
    expect(layoutLockTarget(true)).toEqual({
      bundleID: "com.berkergungor.layoutlock.dev",
      urlScheme: "layoutlock-dev",
      applicationSupportDirectoryName: "LayoutLock Dev",
    });
  });

  it("keeps production and development integration indexes separate", () => {
    expect(layoutIndexPath(productionLayoutLockTarget)).toContain(
      "/Library/Application Support/LayoutLock/Integrations/layouts-v1.json",
    );
    expect(layoutIndexPath(developmentLayoutLockTarget)).toContain(
      "/Library/Application Support/LayoutLock Dev/Integrations/layouts-v1.json",
    );
    expect(layoutIndexPath(productionLayoutLockTarget)).not.toBe(layoutIndexPath(developmentLayoutLockTarget));
  });

  it("bypasses installed-app inventory only in development", () => {
    expect(canDispatchToLayoutLock([], developmentLayoutLockTarget, true)).toBe(true);
    expect(canDispatchToLayoutLock([], productionLayoutLockTarget, false)).toBe(false);
    expect(
      canDispatchToLayoutLock([{ bundleId: productionLayoutLockTarget.bundleID }], productionLayoutLockTarget, false),
    ).toBe(true);
  });

  it("encodes capture names without shell interpolation", () => {
    expect(makeCaptureURL()).toBe("layoutlock://capture");
    expect(makeCaptureURL("  Deep Work & Notes  ")).toBe("layoutlock://capture?name=Deep%20Work%20%26%20Notes");
    expect(makeCaptureURL("C++ Focus")).toBe("layoutlock://capture?name=C%2B%2B%20Focus");
    expect(makeCaptureURL("İstanbul Çalışma")).toBe("layoutlock://capture?name=%C4%B0stanbul%20%C3%87al%C4%B1%C5%9Fma");
    expect(makeCaptureURL("$(touch /tmp/nope)")).toBe("layoutlock://capture?name=%24%28touch%20%2Ftmp%2Fnope%29");
    expect(makeCaptureURL("C++ Focus", developmentLayoutLockTarget)).toBe(
      "layoutlock-dev://capture?name=C%2B%2B%20Focus",
    );
  });

  it("creates restore URLs and exact open arguments", () => {
    const url = makeRestoreURL(layout.id);
    expect(url).toBe(`layoutlock://restore?id=${layout.id}`);
    expect(makeOpenArguments(url)).toEqual(["-gj", "-b", layoutLockBundleID, url]);

    const developmentURL = makeRestoreURL(layout.id, developmentLayoutLockTarget);
    expect(developmentURL).toBe(`layoutlock-dev://restore?id=${layout.id}`);
    expect(makeOpenArguments(developmentURL, developmentLayoutLockTarget)).toEqual([
      "-gj",
      "-b",
      "com.berkergungor.layoutlock.dev",
      developmentURL,
    ]);
  });

  it("dispatches with execFile and an argument array", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const url = makeRestoreURL(layout.id);

    await dispatchToLayoutLock(url, productionLayoutLockTarget, run);

    expect(run).toHaveBeenCalledWith("/usr/bin/open", ["-gj", "-b", layoutLockBundleID, url]);
  });

  it("requires a compatible index before dispatching a save", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);

    await dispatchCaptureToCompatibleLayoutLock(
      "Deep Work & Notes",
      productionLayoutLockTarget,
      async () => ({ schemaVersion: 1, layouts: [] }),
      dispatch,
    );

    expect(dispatch).toHaveBeenCalledWith(
      "layoutlock://capture?name=Deep%20Work%20%26%20Notes",
      productionLayoutLockTarget,
    );
  });

  it("does not dispatch a save when the compatible index is missing", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);
    const error = new MissingLayoutIndexError("missing");

    await expect(
      dispatchCaptureToCompatibleLayoutLock(
        undefined,
        productionLayoutLockTarget,
        async () => {
          throw error;
        },
        dispatch,
      ),
    ).rejects.toBe(error);

    expect(dispatch).not.toHaveBeenCalled();
    expect(layoutIndexRecoveryMessage(error)).toBe("Open or update LayoutLock once, then try again.");
    expect(layoutIndexRecoveryMessage(new UnsupportedLayoutIndexError("unsupported"))).toBe(
      "Update LayoutLock, open it once, then try again.",
    );
  });
});
