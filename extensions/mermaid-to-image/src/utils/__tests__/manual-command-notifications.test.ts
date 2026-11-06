import { afterEach, describe, expect, it, vi } from "vitest";
import * as raycast from "@raycast/api";
import * as notifications from "../notifications";
import { getOndineRuntime } from "../../renderers/ondine-runtime";
import { notifyManualGenerationFailure } from "../manual-command-notifications";

describe("manual failure notifications", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps source-bearing Ondine diagnostics out of toast sharing actions", async () => {
    const runtime = await getOndineRuntime();
    let failure: unknown;
    try {
      runtime.render("sequenceDiagram\n deactivate ConfidentialActor");
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeDefined();
    const toast = vi.spyOn(raycast, "showToast");
    const shareableFailure = vi.spyOn(notifications, "showActionFailureToast");
    await notifyManualGenerationFailure(failure, "Source: deactivate ConfidentialActor");
    expect(shareableFailure).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      style: raycast.Toast.Style.Failure,
      title: "Diagram Generation Failed",
      message: "Ondine semantic error. See the command view for details.",
    });
    expect(JSON.stringify(toast.mock.calls)).not.toContain("ConfidentialActor");
  });

  it("preserves existing notifications for other failures", async () => {
    const failure = new Error("Unable to write image");
    const notify = vi.spyOn(notifications, "showActionFailureToast");
    await notifyManualGenerationFailure(failure, failure.message);
    expect(notify).toHaveBeenCalledWith(failure, "Diagram Generation Failed", failure.message);
  });
});
