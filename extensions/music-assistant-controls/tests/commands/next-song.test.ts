import { showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "../../src/music-assistant/music-assistant-client";
import { getSelectedQueueID } from "../../src/player-selection/use-selected-player-id";
import nextSongMain from "../../src/next-song";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("@raycast/utils");
jest.mock("../../src/music-assistant/music-assistant-client");
jest.mock("../../src/player-selection/use-selected-player-id");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockShowFailureToast = showFailureToast as jest.MockedFunction<typeof showFailureToast>;
const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

describe("next-song command", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    mockClientInstance = {
      next: jest.fn(),
      getPlayer: jest.fn(),
      formatCurrentMediaTitle: jest.fn(),
    } as any;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
    mockShowToast.mockResolvedValue({} as any);
  });

  it("should execute next command successfully when player is selected", async () => {
    const selectedPlayerID = "test-player-123";
    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.next.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValue({
      current_media: {
        title: "Song Title",
        artist: "Artist Name",
      },
    } as any);
    mockClientInstance.formatCurrentMediaTitle.mockReturnValue("Song Title - Artist Name");

    await nextSongMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.next).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.getPlayer).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.formatCurrentMediaTitle).toHaveBeenCalledWith(
      { title: "Song Title", artist: "Artist Name" },
      "Next song",
    );
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "⏭️ Song Title - Artist Name",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should return early when no player is selected", async () => {
    mockGetSelectedQueueID.mockResolvedValue(undefined as any);

    await nextSongMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).not.toHaveBeenCalled();
    expect(mockClientInstance.next).not.toHaveBeenCalled();
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should show failure toast when next command fails", async () => {
    const selectedPlayerID = "test-player-123";
    const error = new Error("Connection failed");

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.next.mockRejectedValue(error);

    await nextSongMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.next).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
      title: "💥 Something went wrong!",
    });
  });

  it("should handle player selection errors gracefully", async () => {
    const error = new Error("Failed to get selected player");
    mockGetSelectedQueueID.mockRejectedValue(error);

    await expect(nextSongMain()).rejects.toThrow("Failed to get selected player");

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).not.toHaveBeenCalled();
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });
});
