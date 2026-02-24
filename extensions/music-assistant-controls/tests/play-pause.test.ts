import { showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "../src/music-assistant-client";
import { getSelectedQueueID } from "../src/use-selected-player-id";
import playPauseMain from "../src/play-pause";
import { PlayerState } from "../src/external-code/interfaces";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("@raycast/utils");
jest.mock("../src/music-assistant-client");
jest.mock("../src/use-selected-player-id");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockShowFailureToast = showFailureToast as jest.MockedFunction<typeof showFailureToast>;
const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

describe("play-pause command", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    mockClientInstance = {
      next: jest.fn(),
      togglePlayPause: jest.fn(),
      getPlayer: jest.fn(),
      getActiveQueues: jest.fn(),
    } as any;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
    mockShowToast.mockResolvedValue();
  });

  it("should execute togglePlayPause command successfully when player is selected", async () => {
    const selectedPlayerID = "test-player-456";
    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.togglePlayPause.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValue({ state: PlayerState.PLAYING } as any);

    await playPauseMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.togglePlayPause).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.getPlayer).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "▶️ Playing",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should show paused toast when toggling to paused state", async () => {
    const selectedPlayerID = "test-player-456";
    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.togglePlayPause.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValue({ state: PlayerState.PAUSED } as any);

    await playPauseMain();

    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "⏸️ Paused",
    });
  });

  it("should return early when no player is selected", async () => {
    mockGetSelectedQueueID.mockResolvedValue(undefined as any);

    await playPauseMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).not.toHaveBeenCalled();
    expect(mockClientInstance.togglePlayPause).not.toHaveBeenCalled();
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should show failure toast when togglePlayPause command fails", async () => {
    const selectedPlayerID = "test-player-456";
    const error = new Error("Player not responding");

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.togglePlayPause.mockRejectedValue(error);

    await playPauseMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.togglePlayPause).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
      title: "💥 Something went wrong!",
    });
  });

  it("should handle player selection errors gracefully", async () => {
    const error = new Error("Failed to get selected player");
    mockGetSelectedQueueID.mockRejectedValue(error);

    await expect(playPauseMain()).rejects.toThrow("Failed to get selected player");

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).not.toHaveBeenCalled();
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });
});