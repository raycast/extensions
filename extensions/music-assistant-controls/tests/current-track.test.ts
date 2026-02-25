import { showToast, Toast } from "@raycast/api";
import MusicAssistantClient from "../src/music-assistant-client";
import { getSelectedQueueID } from "../src/use-selected-player-id";
import { PlayerQueue, RepeatMode, PlayerState } from "../src/external-code/interfaces";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("../src/music-assistant-client");
jest.mock("../src/use-selected-player-id");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

// Mock queue data
const mockQueueData: PlayerQueue = {
  queue_id: "test-queue-123",
  display_name: "Living Room",
  state: PlayerState.PLAYING,
  shuffle_enabled: false,
  repeat_mode: RepeatMode.OFF,
  current_item: {
    name: "Test Track",
    uri: "spotify:track:123",
    duration: 180,
    artists: [{ name: "Test Artist" }],
    album: { name: "Test Album" },
  } as any,
};

describe("current-track command", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClientInstance = {
      getPlayerQueue: jest.fn(),
      toggleShuffle: jest.fn(),
      cycleRepeatMode: jest.fn(),
      addToFavorites: jest.fn(),
      addTracksToPlaylist: jest.fn(),
      getLibraryPlaylists: jest.fn(),
      getQueueAlbumArt: jest.fn(),
      formatDuration: jest.fn(),
      getRepeatText: jest.fn(),
    } as any;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
    mockShowToast.mockResolvedValue();
  });

  describe("shuffle toggle", () => {
    it("should toggle shuffle and show success toast when enabled", async () => {
      const queueWithShuffleOff = { ...mockQueueData, shuffle_enabled: false };
      mockClientInstance.toggleShuffle.mockResolvedValue(undefined);

      await mockClientInstance.toggleShuffle(queueWithShuffleOff.queue_id);

      expect(mockClientInstance.toggleShuffle).toHaveBeenCalledWith(queueWithShuffleOff.queue_id);
      expect(mockClientInstance.toggleShuffle).toHaveBeenCalledTimes(1);
    });

    it("should handle shuffle toggle errors gracefully", async () => {
      const error = new Error("Failed to toggle shuffle");
      mockClientInstance.toggleShuffle.mockRejectedValue(error);

      await expect(mockClientInstance.toggleShuffle("test-queue")).rejects.toThrow("Failed to toggle shuffle");
    });
  });

  describe("repeat mode cycling", () => {
    it("should cycle repeat mode through OFF → ONE → ALL → OFF", async () => {
      mockClientInstance.cycleRepeatMode.mockResolvedValue(undefined);

      await mockClientInstance.cycleRepeatMode(mockQueueData.queue_id);

      expect(mockClientInstance.cycleRepeatMode).toHaveBeenCalledWith(mockQueueData.queue_id);
    });

    it("should handle repeat mode cycle errors gracefully", async () => {
      const error = new Error("Failed to cycle repeat mode");
      mockClientInstance.cycleRepeatMode.mockRejectedValue(error);

      await expect(mockClientInstance.cycleRepeatMode("test-queue")).rejects.toThrow("Failed to cycle repeat mode");
    });
  });

  describe("add to favorites", () => {
    it("should add current track to favorites", async () => {
      mockClientInstance.addToFavorites.mockResolvedValue(undefined);

      await mockClientInstance.addToFavorites(mockQueueData.current_item.uri);

      expect(mockClientInstance.addToFavorites).toHaveBeenCalledWith(mockQueueData.current_item.uri);
    });

    it("should handle add to favorites errors gracefully", async () => {
      const error = new Error("Failed to add to favorites");
      mockClientInstance.addToFavorites.mockRejectedValue(error);

      await expect(mockClientInstance.addToFavorites("uri")).rejects.toThrow("Failed to add to favorites");
    });
  });

  describe("add to playlist", () => {
    it("should add current track to specified playlist", async () => {
      mockClientInstance.addTracksToPlaylist.mockResolvedValue(undefined);

      await mockClientInstance.addTracksToPlaylist("playlist-123", [mockQueueData.current_item.uri]);

      expect(mockClientInstance.addTracksToPlaylist).toHaveBeenCalledWith("playlist-123", [
        mockQueueData.current_item.uri,
      ]);
    });

    it("should handle add to playlist errors gracefully", async () => {
      const error = new Error("Failed to add to playlist");
      mockClientInstance.addTracksToPlaylist.mockRejectedValue(error);

      await expect(mockClientInstance.addTracksToPlaylist("playlist-123", ["uri"])).rejects.toThrow(
        "Failed to add to playlist",
      );
    });
  });

  describe("library playlists", () => {
    it("should fetch library playlists with correct parameters", async () => {
      const mockPlaylists = [
        { item_id: "1", name: "Favorites", uri: "spotify:playlist:1" },
        { item_id: "2", name: "Workout", uri: "spotify:playlist:2" },
      ];

      mockClientInstance.getLibraryPlaylists.mockResolvedValue(mockPlaylists as any);

      const result = await mockClientInstance.getLibraryPlaylists(undefined, 20, 0);

      expect(mockClientInstance.getLibraryPlaylists).toHaveBeenCalledWith(undefined, 20, 0);
      expect(result).toEqual(mockPlaylists);
      expect(result).toHaveLength(2);
    });

    it("should handle empty playlist list", async () => {
      mockClientInstance.getLibraryPlaylists.mockResolvedValue([]);

      const result = await mockClientInstance.getLibraryPlaylists(undefined, 20, 0);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should handle playlist fetch errors gracefully", async () => {
      const error = new Error("Failed to fetch playlists");
      mockClientInstance.getLibraryPlaylists.mockRejectedValue(error);

      await expect(mockClientInstance.getLibraryPlaylists(undefined, 20, 0)).rejects.toThrow(
        "Failed to fetch playlists",
      );
    });
  });

  describe("queue data formatting", () => {
    it("should format duration correctly", () => {
      mockClientInstance.formatDuration.mockReturnValue("3:00");

      const result = mockClientInstance.formatDuration(180);

      expect(result).toBe("3:00");
      expect(mockClientInstance.formatDuration).toHaveBeenCalledWith(180);
    });

    it("should get queue album art when available", () => {
      const mockArtUrl = "https://example.com/image.jpg";
      mockClientInstance.getQueueAlbumArt.mockReturnValue(mockArtUrl);

      const result = mockClientInstance.getQueueAlbumArt(mockQueueData);

      expect(result).toBe(mockArtUrl);
      expect(mockClientInstance.getQueueAlbumArt).toHaveBeenCalledWith(mockQueueData);
    });

    it("should return undefined when album art is not available", () => {
      mockClientInstance.getQueueAlbumArt.mockReturnValue(undefined);

      const result = mockClientInstance.getQueueAlbumArt(mockQueueData);

      expect(result).toBeUndefined();
    });

    it("should format repeat mode text correctly", () => {
      mockClientInstance.getRepeatText.mockReturnValue("Repeat: OFF");

      const result = mockClientInstance.getRepeatText(RepeatMode.OFF);

      expect(result).toBe("Repeat: OFF");
      expect(mockClientInstance.getRepeatText).toHaveBeenCalledWith(RepeatMode.OFF);
    });
  });

  describe("queue selection", () => {
    it("should get selected queue ID", async () => {
      const selectedQueueId = "queue-123";
      mockGetSelectedQueueID.mockResolvedValue(selectedQueueId);

      const result = await mockGetSelectedQueueID();

      expect(result).toBe(selectedQueueId);
      expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    });

    it("should fetch queue data when queue is selected", async () => {
      mockGetSelectedQueueID.mockResolvedValue("queue-123");
      mockClientInstance.getPlayerQueue.mockResolvedValue(mockQueueData);

      const queueId = await mockGetSelectedQueueID();
      const queueData = await mockClientInstance.getPlayerQueue(queueId);

      expect(queueData).toEqual(mockQueueData);
      expect(mockClientInstance.getPlayerQueue).toHaveBeenCalledWith("queue-123");
    });
  });
});
