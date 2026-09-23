import { beforeEach, describe, expect, it } from "vitest";
import {
  LocalStorage,
  resetRaycastMock,
  setMockPreferences,
  storedValue,
} from "./raycast-api";
import {
  LEGACY_SELECTED_SITE_KEY,
  SELECTED_SITE_KEY,
  getSelectedSite,
  setSelectedSite,
} from "../src/api/preferences";
import type { Site } from "../src/api/types";

const site: Site = { id: "site-1", internalReference: "default", name: "Home" };

describe("selected site storage", () => {
  beforeEach(() => resetRaycastMock());

  it("does not reuse a site after the controller identity changes", async () => {
    setMockPreferences({ connectionMode: "local", controllerUrl: "https://192.168.1.1" });
    await setSelectedSite(site);

    setMockPreferences({ connectionMode: "local", controllerUrl: "https://192.168.1.2" });

    await expect(getSelectedSite()).resolves.toBeUndefined();
  });

  it("migrates the legacy selected-site value into controller-scoped storage", async () => {
    setMockPreferences({ connectionMode: "local", controllerUrl: "https://192.168.1.1" });
    await LocalStorage.setItem(LEGACY_SELECTED_SITE_KEY, JSON.stringify(site));

    await expect(getSelectedSite()).resolves.toEqual(site);
    expect(storedValue(LEGACY_SELECTED_SITE_KEY)).toBeUndefined();
    expect(JSON.parse(storedValue(SELECTED_SITE_KEY) as string)).toMatchObject({
      connectionIdentity: "local:https://192.168.1.1",
      site,
    });
  });
});
