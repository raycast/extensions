import { showToast, Toast } from "@raycast/api";
import MusicAssistantClient from "../src/music-assistant-client";
import { getSelectedQueueID } from "../src/use-selected-player-id";
import { MediaType, PlayerQueue, RepeatMode, PlayerState, Track } from "../src/external-code/interfaces";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("../src/music-assistant-client");
jest.mock("../src/use-selected-player-id");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

const mockTrackMediaItem: Track = {
  item_id: "track-1",
  provider: "library",
  name: "Test Track",
  uri: "spotify:track:123",
  is_playable: true,
  media_type: MediaType.TRACK,
  provider_mappings: [],
  metadata: {},
  favorite: false,
  timestamp_added: 0,
  timestamp_modified: 0,
  duration: 180,
  artists: [],
  album: {
    item_id: "album-1",
    provider: "library",
    name: "Test Album",
    uri: "spotify:album:1",
    is_playable: false,
    media_type: MediaType.ALBUM,
    available: true,
  },
};

// Mock queue data
const mockQueueData: PlayerQueue = {
  queue_id: "test-queue-123",
  active: true,
  display_name: "Living Room",
  available: true,
  items: 1,
  state: PlayerState.PLAYING,
  shuffle_enabled: false,
  dont_stop_the_music_enabled: false,
  repeat_mode: RepeatMode.OFF,
  elapsed_time: 0,
  elapsed_time_last_updated: 0,
  radio_source: [],
  current_item: {
    queue_id: "test-queue-123",
    queue_item_id: "queue-item-1",
    name: "Test Track",
    duration: 180,
    sort_index: 0,
    available: true,
    media_item: mockTrackMediaItem,
  },
};

describe("current-track command", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClientInstance = {
      getPlayerQueue: jest.fn(),
      toggleShuffle: jest.fn(),
      cycleRepeatMode: jest.fn(),
      toggleFavorite: jest.fn(),
      getItemByUri: jest.fn(),
      addTracksToPlaylist: jest.fn(),
      getLibraryPlaylists: jest.fn(),
      getQueueAlbumArt: jest.fn(),
      formatDuration: jest.fn(),
      getRepeatText: jest.fn(),
    } as unknown as jest.Mocked<MusicAssistantClient>;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
    mockShowToast.mockResolvedValue({ style: Toast.Style.Success, title: "Mock Toast" } as Toast);
  });

  describe("shuffle toggle", () => {
    it("should toggle shuffle and show success toast when enabled", async () => {
      const queueWithShuffleOff = { ...mockQueueData, shuffle_enabled: false };
      mockClientInstance.toggleShuffle.mockResolvedValue(undefined);

      await mockClientInstance.toggleShuffle(queueWithShuffleOff.queue_id, queueWithShuffleOff.shuffle_enabled);

      expect(mockClientInstance.toggleShuffle).toHaveBeenCalledWith(
        queueWithShuffleOff.queue_id,
        queueWithShuffleOff.shuffle_enabled,
      );
      expect(mockClientInstance.toggleShuffle).toHaveBeenCalledTimes(1);
    });

    it("should handle shuffle toggle errors gracefully", async () => {
      const error = new Error("Failed to toggle shuffle");
      mockClientInstance.toggleShuffle.mockRejectedValue(error);

      await expect(mockClientInstance.toggleShuffle("test-queue", false)).rejects.toThrow("Failed to toggle shuffle");
    });
  });

  describe("repeat mode cycling", () => {
    it("should cycle repeat mode through OFF → ONE → ALL → OFF", async () => {
      mockClientInstance.cycleRepeatMode.mockResolvedValue(undefined);

      await mockClientInstance.cycleRepeatMode(mockQueueData.queue_id, mockQueueData.repeat_mode);

      expect(mockClientInstance.cycleRepeatMode).toHaveBeenCalledWith(mockQueueData.queue_id, mockQueueData.repeat_mode);
    });

    it("should handle repeat mode cycle errors gracefully", async () => {
      const error = new Error("Failed to cycle repeat mode");
      mockClientInstance.cycleRepeatMode.mockRejectedValue(error);

      await expect(mockClientInstance.cycleRepeatMode("test-queue", RepeatMode.OFF)).rejects.toThrow(
        "Failed to cycle repeat mode",
      );
    });
  });

  describe("toggle favorites", () => {
    it("should toggle current track favorite status", async () => {
      const mediaItem = mockQueueData.current_item?.media_item;
      expect(mediaItem).toBeDefined();
      if (!mediaItem) throw new Error("Expected media item to be defined");

      mockClientInstance.toggleFavorite.mockResolvedValue(true);

      await mockClientInstance.toggleFavorite(mediaItem);

      expect(mockClientInstance.toggleFavorite).toHaveBeenCalledWith(mediaItem);
    });

    it("should handle toggle favorites errors gracefully", async () => {
      const mediaItem = mockQueueData.current_item?.media_item;
      expect(mediaItem).toBeDefined();
      if (!mediaItem) throw new Error("Expected media item to be defined");

      const error = new Error("Failed to toggle favorites");
      mockClientInstance.toggleFavorite.mockRejectedValue(error);

      await expect(mockClientInstance.toggleFavorite(mediaItem)).rejects.toThrow("Failed to toggle favorites");
    });
  });

  describe("add to playlist", () => {
    it("should add current track to specified playlist", async () => {
      mockClientInstance.addTracksToPlaylist.mockResolvedValue(undefined);

      await mockClientInstance.addTracksToPlaylist("playlist-123", [mockTrackMediaItem.uri]);

      expect(mockClientInstance.addTracksToPlaylist).toHaveBeenCalledWith("playlist-123", [
        mockTrackMediaItem.uri,
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

      mockClientInstance.getLibraryPlaylists.mockResolvedValue(
        mockPlaylists as unknown as Awaited<ReturnType<MusicAssistantClient["getLibraryPlaylists"]>>,
      );

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
      expect(queueId).toBeDefined();
      if (!queueId) throw new Error("Expected queue ID to be defined");
      const queueData = await mockClientInstance.getPlayerQueue(queueId);

      expect(queueData).toEqual(mockQueueData);
      expect(mockClientInstance.getPlayerQueue).toHaveBeenCalledWith("queue-123");
    });
  });
});
