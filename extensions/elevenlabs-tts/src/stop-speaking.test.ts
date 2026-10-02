import { showHUD } from "@raycast/api";
import { isSpeechSessionActive, stopActivePlayback } from "./audio/playback";
import Command from "./stop-speaking";

// @raycast/api is provided by Raycast at runtime, so it has no resolvable module under Jest
jest.mock("@raycast/api", () => ({ showHUD: jest.fn() }), { virtual: true });
jest.mock("./audio/playback", () => ({ isSpeechSessionActive: jest.fn(), stopActivePlayback: jest.fn() }));

const mockedShowHUD = showHUD as jest.MockedFunction<typeof showHUD>;
const mockedStop = stopActivePlayback as jest.MockedFunction<typeof stopActivePlayback>;
const mockedIsActive = isSpeechSessionActive as jest.MockedFunction<typeof isSpeechSessionActive>;

describe("Stop Speaking", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reports a stopped player", async () => {
    mockedStop.mockResolvedValue("stopped");

    await Command();

    expect(mockedShowHUD).toHaveBeenCalledWith("⏹️ Stopped");
  });

  it("reports a failed stop instead of claiming nothing is playing", async () => {
    mockedStop.mockResolvedValue("failed");

    await Command();

    expect(mockedShowHUD).toHaveBeenCalledWith("⚠️ Couldn't stop playback");
  });

  it("reports nothing playing when no session is active", async () => {
    mockedStop.mockResolvedValue("not-playing");
    mockedIsActive.mockResolvedValue(false);

    await Command();

    expect(mockedStop).toHaveBeenCalledTimes(1);
    expect(mockedShowHUD).toHaveBeenCalledWith("Nothing is playing");
  });

  it("waits for a starting session's player and stops it", async () => {
    jest.useFakeTimers();
    mockedStop.mockResolvedValueOnce("not-playing").mockResolvedValueOnce("stopped");
    mockedIsActive.mockResolvedValue(true);

    const run = Command();
    await jest.advanceTimersByTimeAsync(250);
    await run;

    expect(mockedStop).toHaveBeenCalledTimes(2);
    expect(mockedShowHUD).toHaveBeenCalledWith("⏹️ Stopped");
  });

  it("gives up when a session is still starting after the wait", async () => {
    jest.useFakeTimers();
    mockedStop.mockResolvedValue("not-playing");
    mockedIsActive.mockResolvedValue(true);

    const run = Command();
    await jest.advanceTimersByTimeAsync(5_000);
    await run;

    expect(mockedShowHUD).toHaveBeenCalledWith("⏳ Speech is still starting, try again");
  });

  it("reports a failure when stopping throws", async () => {
    mockedStop.mockRejectedValue(new Error("boom"));

    await Command();

    expect(mockedShowHUD).toHaveBeenCalledWith("⚠️ Couldn't stop playback");
  });
});
