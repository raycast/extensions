/**
 * The action toast's handle against Raycast's toast slot. `updateToast` carries
 * no id: Raycast applies it to whatever toast is on screen when it gets there,
 * so a progress update sent in the same tick as the final toast can land on
 * top of it and leave "Installing …" with a Cancel button on a finished job.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { __raycast } from "./__mocks__/raycast-api";
import { showActionToast } from "./toast";

const flushMicrotasks = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

beforeEach(() => __raycast.reset());

describe("showActionToast", () => {
  it("does not show the final toast in the same tick as a progress update", async () => {
    const handle = showActionToast({ title: "Installing Tinycast", cancelable: true });
    handle.updateMessage("Operation completed successfully");
    const settled = handle.showSuccessHUD("Installed Tinycast");
    await flushMicrotasks();
    expect(__raycast.toasts).toHaveLength(1); // only the progress toast so far
    await settled;
    expect(__raycast.toasts).toHaveLength(2);
    expect(__raycast.toasts[1]).toMatchObject({ style: "success", title: "Installed Tinycast" });
  });

  it("ignores progress that arrives after it settled", async () => {
    const handle = showActionToast({ title: "Installing Tinycast", cancelable: true });
    await handle.showSuccessHUD("Installed Tinycast");
    handle.updateMessage("late");
    handle.updateTitle("late");
    expect(__raycast.toasts[0].messages).not.toContain("late");
    expect(__raycast.toasts[0].title).toBe("Installing Tinycast");
  });

  it("settles without waiting when no update is recent", async () => {
    const handle = showActionToast({ title: "Installing Tinycast", cancelable: true });
    const settled = handle.showFailureHUD("Failed to install Tinycast");
    await flushMicrotasks();
    expect(__raycast.toasts).toHaveLength(2);
    await settled;
  });

  // Callers that hide and then show a toast of their own (a declined upgrade,
  // a canceled batch) replace the slot just as settling does.
  it("hide waits out a recent update before resolving", async () => {
    const handle = showActionToast({ title: "Upgrading", cancelable: true });
    handle.updateMessage("Pouring foo");
    const started = performance.now();
    await handle.hide();
    expect(performance.now() - started).toBeGreaterThanOrEqual(200);
    handle.updateMessage("late");
    expect(__raycast.toasts[0].messages).toEqual(["Pouring foo"]);
  });

  it("still forwards progress while running", () => {
    const handle = showActionToast({ title: "Installing Tinycast", cancelable: true });
    handle.updateMessage("Downloading 40%");
    expect(__raycast.toasts[0].messages).toEqual(["Downloading 40%"]);
  });
});
