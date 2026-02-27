import { showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "../../src/music-assistant/music-assistant-client";
import { getSelectedQueueID } from "../../src/player-selection/use-selected-player-id";
import previousSongMain from "../../src/previous-song";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("@raycast/utils");
jest.mock("../../src/music-assistant/music-assistant-client");
jest.mock("../../src/player-selection/use-selected-player-id");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockShowFailureToast = showFailureToast as jest.MockedFunction<typeof showFailureToast>;
const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

describe("previous-song command", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    mockClientInstance = {
      previous: jest.fn(),
      getPlayer: jest.fn(),
      formatCurrentMediaTitle: jest.fn(),
    } as any;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
    mockShowToast.mockResolvedValue({} as any);
  });

  it("should execute previous command successfully when player is selected", async () => {
    const selectedPlayerID = "test-player-123";
    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.previous.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValue({
      current_media: {
        title: "Song Title",
        artist: "Artist Name",
      },
    } as any);
    mockClientInstance.formatCurrentMediaTitle.mockReturnValue("Song Title - Artist Name");

    await previousSongMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.previous).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.getPlayer).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.formatCurrentMediaTitle).toHaveBeenCalledWith(
      { title: "Song Title", artist: "Artist Name" },
      "Previous song",
    );
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "⏮️ Song Title - Artist Name",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should return early when no player is selected", async () => {
    mockGetSelectedQueueID.mockResolvedValue(undefined as any);

    await previousSongMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).not.toHaveBeenCalled();
    expect(mockClientInstance.previous).not.toHaveBeenCalled();
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should show failure toast when previous command fails", async () => {
    const selectedPlayerID = "test-player-123";
    const error = new Error("Connection failed");

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.previous.mockRejectedValue(error);

    await previousSongMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.previous).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
      title: "💥 Something went wrong!",
    });
  });

  it("should handle player selection errors gracefully", async () => {
    const error = new Error("Failed to get selected player");
    mockGetSelectedQueueID.mockRejectedValue(error);

    await expect(previousSongMain()).rejects.toThrow("Failed to get selected player");

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).not.toHaveBeenCalled();
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });
});
