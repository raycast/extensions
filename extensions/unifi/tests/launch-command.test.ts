import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchUniFiCommand } from "../src/lib/launch-command";
import { resetRaycastMock, setMockLaunchCommand, shownToasts } from "./raycast-api";

describe("launchUniFiCommand", () => {
  beforeEach(() => {
    resetRaycastMock();
  });

  it("reports command launch failures instead of leaving a rejected promise", async () => {
    setMockLaunchCommand(vi.fn().mockRejectedValue(new Error("Command unavailable")));

    launchUniFiCommand({ name: "view-devices" }, "Could not open devices");

    await vi.waitFor(() => {
      expect(shownToasts()).toEqual([
        {
          style: "failure",
          title: "Could not open devices",
          message: "Command unavailable",
        },
      ]);
    });
  });
});
