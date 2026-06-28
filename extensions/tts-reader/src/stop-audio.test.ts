import { afterEach, describe, expect, it, vi } from "vitest";

const abortActiveStreamingRequestMock = vi.fn();
vi.mock("./stream-session", () => ({
  abortActiveStreamingRequest: (...args: unknown[]) => abortActiveStreamingRequestMock(...args),
}));

const stopPlaybackMock = vi.fn();
vi.mock("./playback-controller", () => ({
  stopPlayback: (...args: unknown[]) => stopPlaybackMock(...args),
}));

const showToastMock = vi.fn();
vi.mock("@raycast/api", () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
  Toast: {
    Style: {
      Success: "Success",
      Failure: "Failure",
    },
  },
}));

describe("stop-audio command", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("reports success when only an active stream was aborted", async () => {
    abortActiveStreamingRequestMock.mockResolvedValue(true);
    stopPlaybackMock.mockResolvedValue(false);

    const command = (await import("./stop-audio")).default;
    await command();

    expect(abortActiveStreamingRequestMock).toHaveBeenCalledTimes(1);
    expect(stopPlaybackMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith({
      style: "Success",
      title: "Audio stopped",
      message: undefined,
    });
  });

  it("reports failure when nothing was stopped", async () => {
    abortActiveStreamingRequestMock.mockResolvedValue(false);
    stopPlaybackMock.mockResolvedValue(false);

    const command = (await import("./stop-audio")).default;
    await command();

    expect(showToastMock).toHaveBeenCalledWith({
      style: "Failure",
      title: "No audio is playing",
      message: "Start reading text first, then stop it here.",
    });
  });
});
