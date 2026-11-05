/**
 * `showActionToast` — how a progress toast finishes.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { __raycast } from "./__mocks__/raycast-api";
import { preferences } from "./preferences";
import { showActionToast } from "./toast";

describe("showActionToast", () => {
  beforeEach(() => {
    __raycast.reset();
    preferences.closeAfterAction = false;
  });

  it("finishes in place and drops Cancel", async () => {
    const handle = showActionToast({ title: "Installing Tinycast", cancelable: true });
    handle.updateMessage("Operation completed successfully");
    await handle.showSuccessHUD("Installed Tinycast");

    expect(__raycast.toasts).toHaveLength(1);
    const [toast] = __raycast.toasts;
    expect(toast.style).toBe("success");
    expect(toast.title).toBe("Installed Tinycast");
    expect(toast.message).toBeUndefined();
    expect(toast.primaryAction).toBeUndefined();
  });

  it("drops Cancel when a cancelable toast fails", async () => {
    const handle = showActionToast({ title: "Installing Tinycast", cancelable: true });
    await handle.showFailureHUD("Could not install Tinycast");

    const [toast] = __raycast.toasts;
    expect(toast.style).toBe("failure");
    expect(toast.primaryAction).toBeUndefined();
  });

  it("shows a HUD instead when Close After Action is on", async () => {
    preferences.closeAfterAction = true;
    const handle = showActionToast({ title: "Installing Tinycast", cancelable: true });
    await handle.showSuccessHUD("Installed Tinycast");

    expect(__raycast.huds).toEqual(["✅ Installed Tinycast"]);
  });
});
