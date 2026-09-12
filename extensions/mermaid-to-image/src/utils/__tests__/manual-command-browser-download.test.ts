import { afterEach, describe, expect, it, vi } from "vitest";
import { createManualCommandBrowserDownloadFlow } from "../manual-command-browser-download";
import type { ResolvedMermaidInput } from "../mermaid-input";

function createSessionStub(pendingInput: ResolvedMermaidInput | null) {
  return {
    getPendingInput: vi.fn(() => pendingInput),
  };
}

describe("manual-command-browser-download", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("no-ops when there is no pending browser setup input", async () => {
    const session = createSessionStub(null);
    const services = {
      installManagedBrowser: vi.fn(),
      getManagedBrowserSupportRoot: vi.fn(),
      notifyManagedBrowserDownloadStarted: vi.fn(),
      notifyManagedBrowserDownloadProgress: vi.fn(),
      notifyManagedBrowserDownloadSuccess: vi.fn(),
      notifyManagedBrowserDownloadFailure: vi.fn(),
      logOperationalError: vi.fn(),
      runResolvedInput: vi.fn(),
    };
    const flow = createManualCommandBrowserDownloadFlow({
      session,
      environmentSupportPath: "/tmp/support",
      services,
    });

    await flow.run();

    expect(services.installManagedBrowser).not.toHaveBeenCalled();
    expect(services.notifyManagedBrowserDownloadStarted).not.toHaveBeenCalled();
    expect(services.runResolvedInput).not.toHaveBeenCalled();
  });

  it("downloads the managed browser, reports progress, and retries the pending input", async () => {
    const pendingInput = { code: "sequenceDiagram\nA->>B: hi", source: "selected" } satisfies ResolvedMermaidInput;
    const toast = { title: "", message: "", style: "animated" };
    const session = createSessionStub(pendingInput);
    const services = {
      installManagedBrowser: vi.fn().mockImplementation(async ({ onProgress }) => {
        onProgress?.(512, 1024);
        return {
          source: "managed",
          executablePath: "/tmp/browser",
          version: "131.0.0",
          installRoot: "/tmp/browser-cache",
        };
      }),
      getManagedBrowserSupportRoot: vi.fn().mockReturnValue("/tmp/browser-cache"),
      notifyManagedBrowserDownloadStarted: vi.fn().mockResolvedValue(toast),
      notifyManagedBrowserDownloadProgress: vi.fn(),
      notifyManagedBrowserDownloadSuccess: vi.fn(),
      notifyManagedBrowserDownloadFailure: vi.fn(),
      logOperationalError: vi.fn(),
      runResolvedInput: vi.fn().mockResolvedValue(undefined),
    };
    const flow = createManualCommandBrowserDownloadFlow({
      session,
      environmentSupportPath: "/tmp/support",
      services,
    });

    await flow.run();

    expect(services.notifyManagedBrowserDownloadStarted).toHaveBeenCalledTimes(1);
    expect(services.notifyManagedBrowserDownloadProgress).toHaveBeenCalledWith(toast, "512 B / 1.0 KB");
    expect(services.notifyManagedBrowserDownloadSuccess).toHaveBeenCalledWith(toast, "managed", "/tmp/browser-cache");
    expect(services.runResolvedInput).toHaveBeenCalledWith(pendingInput);
  });

  it("reports download failure without retrying the pending input", async () => {
    const pendingInput = { code: "flowchart TD\nA --> B", source: "selected" } satisfies ResolvedMermaidInput;
    const session = createSessionStub(pendingInput);
    const services = {
      installManagedBrowser: vi.fn().mockRejectedValue(new Error("nope")),
      getManagedBrowserSupportRoot: vi.fn(),
      notifyManagedBrowserDownloadStarted: vi.fn().mockResolvedValue({}),
      notifyManagedBrowserDownloadProgress: vi.fn(),
      notifyManagedBrowserDownloadSuccess: vi.fn(),
      notifyManagedBrowserDownloadFailure: vi.fn().mockResolvedValue(undefined),
      logOperationalError: vi.fn(),
      runResolvedInput: vi.fn(),
    };
    const flow = createManualCommandBrowserDownloadFlow({
      session,
      environmentSupportPath: "/tmp/support",
      services,
    });

    await flow.run();

    expect(services.logOperationalError).toHaveBeenCalledWith("download-managed-browser-failed", expect.any(Error), {
      source: "managed",
    });
    expect(services.notifyManagedBrowserDownloadFailure).toHaveBeenCalledWith(expect.any(Error));
    expect(services.runResolvedInput).not.toHaveBeenCalled();
  });
});
