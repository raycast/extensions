import MusicAssistantClient from "../src/music-assistant-client";
import executeApiCommand from "../src/api-command";
import { showHUD } from "@raycast/api";
import { storeSelectedQueueID } from "../src/use-selected-player-id";
import { PlayerQueue, PlayerState } from "../src/external-code/interfaces";
import { StoredQueue } from "../src/use-selected-player-id";

// Mock the dependencies
jest.mock("../src/api-command");
jest.mock("@raycast/api");
jest.mock("../src/use-selected-player-id");

const mockExecuteApiCommand = executeApiCommand as jest.MockedFunction<typeof executeApiCommand>;
const mockShowHUD = showHUD as jest.MockedFunction<typeof showHUD>;
const mockStoreSelectedQueueID = storeSelectedQueueID as jest.MockedFunction<typeof storeSelectedQueueID>;

describe("MusicAssistantClient", () => {
  let client: MusicAssistantClient;

  beforeEach(() => {
    client = new MusicAssistantClient();
    mockExecuteApiCommand.mockReset();
  });

  describe("next", () => {
    it("should call playerCommandNext with correct playerId", async () => {
      const playerId = "test-player-123";
      const mockApi = {
        playerCommandNext: jest.fn().mockResolvedValue(undefined),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      await client.next(playerId);

      expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
      expect(mockApi.playerCommandNext).toHaveBeenCalledWith(playerId);
    });

    it("should handle errors from API command", async () => {
      const playerId = "test-player-123";
      const error = new Error("API Error");

      mockExecuteApiCommand.mockRejectedValue(error);

      await expect(client.next(playerId)).rejects.toThrow("API Error");
    });
  });

  describe("togglePlayPause", () => {
    it("should call playerCommandPlayPause with correct playerId", async () => {
      const playerId = "test-player-456";
      const mockApi = {
        playerCommandPlayPause: jest.fn().mockResolvedValue(undefined),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      await client.togglePlayPause(playerId);

      expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
      expect(mockApi.playerCommandPlayPause).toHaveBeenCalledWith(playerId);
    });

    it("should handle errors from API command", async () => {
      const playerId = "test-player-456";
      const error = new Error("Connection failed");

      mockExecuteApiCommand.mockRejectedValue(error);

      await expect(client.togglePlayPause(playerId)).rejects.toThrow("Connection failed");
    });
  });

  describe("setVolume", () => {
    it("should call playerCommandVolumeSet with correct playerId and volume", async () => {
      const playerId = "test-player-789";
      const volume = 75;
      const mockApi = {
        playerCommandVolumeSet: jest.fn().mockResolvedValue(undefined),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      await client.setVolume(playerId, volume);

      expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
      expect(mockApi.playerCommandVolumeSet).toHaveBeenCalledWith(playerId, volume);
    });

    it("should handle errors from API command", async () => {
      const playerId = "test-player-789";
      const volume = 50;
      const error = new Error("Volume control failed");

      mockExecuteApiCommand.mockRejectedValue(error);

      await expect(client.setVolume(playerId, volume)).rejects.toThrow("Volume control failed");
    });
  });

  describe("getPlayer", () => {
    it("should call getPlayer with correct playerId", async () => {
      const playerId = "test-player-123";
      const mockPlayer = { player_id: playerId, volume_level: 50, volume_control: "internal" };
      const mockApi = {
        getPlayer: jest.fn().mockResolvedValue(mockPlayer),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      const result = await client.getPlayer(playerId);

      expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
      expect(mockApi.getPlayer).toHaveBeenCalledWith(playerId);
      expect(result).toEqual(mockPlayer);
    });

    it("should handle errors from API command", async () => {
      const playerId = "test-player-123";
      const error = new Error("Player not found");

      mockExecuteApiCommand.mockRejectedValue(error);

      await expect(client.getPlayer(playerId)).rejects.toThrow("Player not found");
    });
  });

  describe("getPlayers", () => {
    it("should call getPlayers API", async () => {
      const mockPlayers = [
        { player_id: "player1", volume_level: 50, volume_control: "internal" },
        { player_id: "player2", volume_level: 75, volume_control: "none" },
      ];
      const mockApi = {
        getPlayers: jest.fn().mockResolvedValue(mockPlayers),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      const result = await client.getPlayers();

      expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
      expect(mockApi.getPlayers).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPlayers);
    });

    it("should handle errors from API command", async () => {
      const error = new Error("Failed to fetch players");

      mockExecuteApiCommand.mockRejectedValue(error);

      await expect(client.getPlayers()).rejects.toThrow("Failed to fetch players");
    });
  });

  describe("getActiveQueues", () => {
    it("should return filtered active queues with current items", async () => {
      const mockQueues = [
        { id: "queue1", active: true, current_item: { id: "item1" } },
        { id: "queue2", active: false, current_item: { id: "item2" } },
        { id: "queue3", active: true, current_item: null },
        { id: "queue4", active: true, current_item: { id: "item4" } },
      ];

      const mockApi = {
        getPlayerQueues: jest.fn().mockResolvedValue(mockQueues),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      const result = await client.getActiveQueues();

      expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
      expect(mockApi.getPlayerQueues).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: "queue1", active: true, current_item: { id: "item1" } },
        { id: "queue4", active: true, current_item: { id: "item4" } },
      ]);
    });

    it("should return empty array when no active queues with current items", async () => {
      const mockQueues = [
        { id: "queue1", active: false, current_item: { id: "item1" } },
        { id: "queue2", active: true, current_item: null },
      ];

      const mockApi = {
        getPlayerQueues: jest.fn().mockResolvedValue(mockQueues),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      const result = await client.getActiveQueues();

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it("should handle API errors", async () => {
      const error = new Error("Failed to fetch queues");

      mockExecuteApiCommand.mockRejectedValue(error);

      await expect(client.getActiveQueues()).rejects.toThrow("Failed to fetch queues");
    });
  });

  // Helper function for creating mock queues
  const createMockQueue = (
    id: string,
    displayName: string,
    state: PlayerState,
    currentItemName?: string,
  ): PlayerQueue => ({
    queue_id: id,
    active: true,
    display_name: displayName,
    available: true,
    items: 10,
    shuffle_enabled: false,
    dont_stop_the_music_enabled: false,
    repeat_mode: "off" as any,
    current_index: 0,
    elapsed_time: 45,
    elapsed_time_last_updated: Date.now(),
    state,
    current_item: currentItemName
      ? {
          queue_item_id: "item-1",
          queue_id: id,
          name: currentItemName,
          duration: 180,
          sort_index: 1,
          streamdetails: undefined,
          available: true,
        }
      : undefined,
    radio_source: [],
  });

  describe("Menu Bar Logic", () => {
    describe("findActiveQueue", () => {
      it("should return undefined when no queues exist", () => {
        const result = client.findActiveQueue([], { queue_id: "test" });
        expect(result).toBeUndefined();
      });

      it("should return the stored queue when it exists", () => {
        const queues = [
          createMockQueue("queue1", "Living Room", PlayerState.PLAYING),
          createMockQueue("queue2", "Kitchen", PlayerState.PAUSED),
        ];
        const storedQueue: StoredQueue = { queue_id: "queue2" };

        const result = client.findActiveQueue(queues, storedQueue);

        expect(result?.queue_id).toBe("queue2");
        expect(result?.display_name).toBe("Kitchen");
      });

      it("should return first queue when stored queue doesn't exist", () => {
        const queues = [
          createMockQueue("queue1", "Living Room", PlayerState.PLAYING),
          createMockQueue("queue2", "Kitchen", PlayerState.PAUSED),
        ];
        const storedQueue: StoredQueue = { queue_id: "nonexistent" };

        const result = client.findActiveQueue(queues, storedQueue);

        expect(result?.queue_id).toBe("queue1");
        expect(result?.display_name).toBe("Living Room");
      });
    });

    describe("getDisplayTitle", () => {
      it("should return current item name when available", () => {
        const queue = createMockQueue("queue1", "Living Room", PlayerState.PLAYING, "Great Song");

        const result = client.getDisplayTitle(queue);

        expect(result).toBe("Great Song");
      });

      it("should return undefined when no current item", () => {
        const queue = createMockQueue("queue1", "Living Room", PlayerState.IDLE);

        const result = client.getDisplayTitle(queue);

        expect(result).toBeUndefined();
      });
    });

    describe("shouldUpdateTitle", () => {
      it("should return true when new title is different", () => {
        const result = client.shouldUpdateTitle("Old Song", "New Song");
        expect(result).toBe(true);
      });

      it("should return false when titles are the same", () => {
        const result = client.shouldUpdateTitle("Same Song", "Same Song");
        expect(result).toBe(false);
      });

      it("should return false when new title is undefined", () => {
        const result = client.shouldUpdateTitle("Current Song", undefined);
        expect(result).toBe(false);
      });
    });

    describe("getPlayPauseButtonText", () => {
      it("should return Pause when playing", () => {
        const result = client.getPlayPauseButtonText(PlayerState.PLAYING);
        expect(result).toBe("Pause");
      });

      it("should return Play when paused", () => {
        const result = client.getPlayPauseButtonText(PlayerState.PAUSED);
        expect(result).toBe("Play");
      });
    });

    describe("isPlaying", () => {
      it("should return true when state is PLAYING", () => {
        const result = client.isPlaying(PlayerState.PLAYING);
        expect(result).toBe(true);
      });

      it("should return false when state is PAUSED", () => {
        const result = client.isPlaying(PlayerState.PAUSED);
        expect(result).toBe(false);
      });
    });

    describe("createQueueSelection", () => {
      it("should create selection with title when current item exists", () => {
        const queue = createMockQueue("queue1", "Living Room", PlayerState.PLAYING, "Amazing Track");

        const result = client.createQueueSelection(queue);

        expect(result).toEqual({
          title: "Amazing Track",
          queueId: "queue1",
        });
      });

      it("should create selection with undefined title when no current item", () => {
        const queue = createMockQueue("queue1", "Living Room", PlayerState.IDLE);

        const result = client.createQueueSelection(queue);

        expect(result).toEqual({
          title: undefined,
          queueId: "queue1",
        });
      });
    });
  });

  describe("Player Selection Logic", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe("selectPlayer", () => {
      it("should store queue ID and show feedback", async () => {
        mockStoreSelectedQueueID.mockResolvedValue();
        mockShowHUD.mockResolvedValue();

        await client.selectPlayer("queue123", "Living Room");

        expect(mockStoreSelectedQueueID).toHaveBeenCalledWith("queue123");
        expect(mockShowHUD).toHaveBeenCalledWith("Living Room selected, allow 10 seconds for the menubar to update!");
      });

      it("should handle storage errors", async () => {
        const error = new Error("Storage failed");
        mockStoreSelectedQueueID.mockRejectedValue(error);

        await expect(client.selectPlayer("queue123", "Living Room")).rejects.toThrow("Storage failed");
        expect(mockShowHUD).not.toHaveBeenCalled();
      });
    });

    describe("showSelectionFeedback", () => {
      it("should show HUD with correct message", async () => {
        mockShowHUD.mockResolvedValue();

        await client.showSelectionFeedback("Kitchen");

        expect(mockShowHUD).toHaveBeenCalledWith("Kitchen selected, allow 10 seconds for the menubar to update!");
      });
    });

    describe("formatSelectionMessage", () => {
      it("should format message correctly", () => {
        const result = client.formatSelectionMessage("Bedroom");
        expect(result).toBe("Bedroom selected, allow 10 seconds for the menubar to update!");
      });
    });
  });

  describe("Volume Control Logic", () => {
    describe("supportsVolumeControl", () => {
      it("should return true when player has internal volume control", () => {
        const player = { player_id: "test", volume_control: "internal" } as any;
        const result = client.supportsVolumeControl(player);
        expect(result).toBe(true);
      });

      it("should return false when player has no volume control", () => {
        const player = { player_id: "test", volume_control: "none" } as any;
        const result = client.supportsVolumeControl(player);
        expect(result).toBe(false);
      });

      it("should return false when player is undefined", () => {
        const result = client.supportsVolumeControl(undefined);
        expect(result).toBe(false);
      });

      it("should return false when volume_control is undefined", () => {
        const player = { player_id: "test" } as any;
        const result = client.supportsVolumeControl(player);
        expect(result).toBe(false);
      });
    });

    describe("getVolumeDisplay", () => {
      it("should return formatted volume with percentage", () => {
        const player = { player_id: "test", volume_control: "internal", volume_level: 75, volume_muted: false } as any;
        const result = client.getVolumeDisplay(player);
        expect(result).toBe("Volume: 75%");
      });

      it("should return formatted volume with muted status", () => {
        const player = { player_id: "test", volume_control: "internal", volume_level: 50, volume_muted: true } as any;
        const result = client.getVolumeDisplay(player);
        expect(result).toBe("Volume: 50% (Muted)");
      });

      it("should return N/A when player doesn't support volume control", () => {
        const player = { player_id: "test", volume_control: "none" } as any;
        const result = client.getVolumeDisplay(player);
        expect(result).toBe("Volume: N/A");
      });

      it("should return N/A when player is undefined", () => {
        const result = client.getVolumeDisplay(undefined);
        expect(result).toBe("Volume: N/A");
      });

      it("should handle missing volume_level", () => {
        const player = { player_id: "test", volume_control: "internal", volume_muted: false } as any;
        const result = client.getVolumeDisplay(player);
        expect(result).toBe("Volume: 0%");
      });
    });

    describe("getVolumeOptions", () => {
      it("should return correct volume options", () => {
        const options = client.getVolumeOptions();
        expect(options).toEqual([
          { level: 0, display: "Mute" },
          { level: 25, display: "25%" },
          { level: 50, display: "50%" },
          { level: 75, display: "75%" },
          { level: 100, display: "100%" },
        ]);
      });
    });
  });
});
