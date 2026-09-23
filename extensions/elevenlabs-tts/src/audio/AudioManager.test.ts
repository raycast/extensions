import { AudioManager } from "./AudioManager";
import { StreamConfig } from "./types";

const config: StreamConfig = {
  sessionId: "test-session",
  text: "Hello there",
  voiceId: "voice",
  apiKey: "key",
  settings: { stability: 0.5, similarity_boost: 0.5 },
  playbackSpeed: "1.00",
};

interface AudioManagerInternals {
  streamState: { isPlaying: boolean; chunksReceived: number; streamComplete: boolean; playbackComplete: boolean };
  handleWebSocketMessage(data: Buffer): Promise<void>;
  handleWebSocketClose(code: number): void;
}

function createManager(): { manager: AudioManager; internals: AudioManagerInternals } {
  const manager = new AudioManager(config);
  return { manager, internals: manager as unknown as AudioManagerInternals };
}

function completion(manager: AudioManager): Promise<void> {
  return new Promise((resolve) => manager.once("complete", () => resolve()));
}

describe("AudioManager stream completion", () => {
  it("completes when the final marker arrives without audio", async () => {
    const { manager, internals } = createManager();
    internals.streamState.isPlaying = true;
    internals.streamState.playbackComplete = true;
    internals.streamState.chunksReceived = 3;

    const complete = completion(manager);
    await internals.handleWebSocketMessage(Buffer.from(JSON.stringify({ isFinal: true })));

    await complete;
    expect(internals.streamState.streamComplete).toBe(true);
  });

  it("completes when the socket closes normally during playback without a final marker", async () => {
    const { manager, internals } = createManager();
    internals.streamState.isPlaying = true;
    internals.streamState.playbackComplete = true;
    internals.streamState.chunksReceived = 3;

    const complete = completion(manager);
    internals.handleWebSocketClose(1000);

    await complete;
    expect(internals.streamState.streamComplete).toBe(true);
  });

  it.each([1005, 1006])("fails when the socket closes with code %i during playback", async (code) => {
    const { manager, internals } = createManager();
    internals.streamState.isPlaying = true;
    internals.streamState.playbackComplete = true;
    internals.streamState.chunksReceived = 3;

    const failure = new Promise<Error>((resolve) => manager.once("error", resolve));
    internals.handleWebSocketClose(code);

    await expect(failure).resolves.toEqual(new Error(`Connection closed unexpectedly (code ${code})`));
    expect(internals.streamState.streamComplete).toBe(false);
  });

  it("fails when the socket closes abnormally before playback starts", async () => {
    const { manager, internals } = createManager();
    internals.streamState.chunksReceived = 3;

    const failure = new Promise<Error>((resolve) => manager.once("error", resolve));
    internals.handleWebSocketClose(1006);

    await expect(failure).resolves.toEqual(new Error("Connection closed unexpectedly (code 1006)"));
  });

  it("defers completion to playback when the socket closes normally before playback starts", () => {
    const { manager, internals } = createManager();
    internals.streamState.chunksReceived = 3;

    const listener = jest.fn();
    manager.once("complete", listener);
    manager.once("error", listener);
    internals.handleWebSocketClose(1000);

    expect(internals.streamState.streamComplete).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores the close after the final marker when playback has not started yet", async () => {
    const { manager, internals } = createManager();
    internals.streamState.chunksReceived = 3;
    internals.streamState.streamComplete = true;

    const listener = jest.fn();
    manager.once("error", listener);
    manager.once("complete", listener);
    internals.handleWebSocketClose(1005);

    expect(listener).not.toHaveBeenCalled();
  });

  it("waits for playback to finish when the final marker arrives first", async () => {
    const { manager, internals } = createManager();
    internals.streamState.isPlaying = true;
    internals.streamState.chunksReceived = 3;

    const listener = jest.fn();
    manager.once("complete", listener);
    await internals.handleWebSocketMessage(Buffer.from(JSON.stringify({ isFinal: true })));

    expect(internals.streamState.streamComplete).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });
});
