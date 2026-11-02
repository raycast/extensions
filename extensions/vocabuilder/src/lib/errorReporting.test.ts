import { captureException } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportUnexpectedError } from "./errorReporting";
import { providerError } from "./providerError";

describe("reportUnexpectedError", () => {
  beforeEach(() => {
    vi.mocked(captureException).mockClear();
  });

  it("reports an unexpected exception to Raycast", () => {
    const error = new Error("unexpected");

    reportUnexpectedError(error);

    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("does not report expected provider failures", () => {
    reportUnexpectedError(
      providerError({ domain: "infrastructure", kind: "network-offline", surface: "translate", provider: "gemini" }),
    );

    expect(captureException).not.toHaveBeenCalled();
  });

  it("does not report user-initiated cancellation", () => {
    reportUnexpectedError(new DOMException("Aborted", "AbortError"));

    expect(captureException).not.toHaveBeenCalled();
  });
});
