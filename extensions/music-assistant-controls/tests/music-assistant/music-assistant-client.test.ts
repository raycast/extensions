import MusicAssistantClient from "../../src/music-assistant/music-assistant-client";
import executeApiCommand from "../../src/music-assistant/api-command";
import { showHUD } from "@raycast/api";
import { storeSelectedQueueID } from "../../src/player-selection/use-selected-player-id";
import { PlayerQueue, PlayerState, RepeatMode } from "../../src/music-assistant/external-code/interfaces";
import { StoredQueue } from "../../src/player-selection/use-selected-player-id";

// Mock the dependencies
jest.mock("../../src/music-assistant/api-command");
jest.mock("@raycast/api");
jest.mock("../../src/player-selection/use-selected-player-id");

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

  describe("previous", () => {
    it("should call playerCommandPrevious with correct playerId", async () => {
      const playerId = "test-player-123";
      const mockApi = {
        playerCommandPrevious: jest.fn().mockResolvedValue(undefined),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      await client.previous(playerId);

      expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
      expect(mockApi.playerCommandPrevious).toHaveBeenCalledWith(playerId);
    });

    it("should handle errors from API command", async () => {
      const playerId = "test-player-123";
      const error = new Error("API Error");

      mockExecuteApiCommand.mockRejectedValue(error);

      await expect(client.previous(playerId)).rejects.toThrow("API Error");
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

  describe("volumeUp", () => {
    it("should call playerCommandVolumeUp API method", async () => {
      const playerId = "test-player-vol";
      const mockApi = {
        playerCommandVolumeUp: jest.fn().mockResolvedValue(undefined),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      await client.volumeUp(playerId);

      expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
      expect(mockApi.playerCommandVolumeUp).toHaveBeenCalledWith(playerId);
    });

    it("should handle errors from API command", async () => {
      const playerId = "test-player-vol";
      const error = new Error("Volume up failed");

      mockExecuteApiCommand.mockRejectedValue(error);

      await expect(client.volumeUp(playerId)).rejects.toThrow("Volume up failed");
    });
  });

  describe("volumeDown", () => {
    it("should call playerCommandVolumeDown API method", async () => {
      const playerId = "test-player-vol";
      const mockApi = {
        playerCommandVolumeDown: jest.fn().mockResolvedValue(undefined),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      await client.volumeDown(playerId);

      expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
      expect(mockApi.playerCommandVolumeDown).toHaveBeenCalledWith(playerId);
    });

    it("should handle errors from API command", async () => {
      const playerId = "test-player-vol";
      const error = new Error("Volume down failed");

      mockExecuteApiCommand.mockRejectedValue(error);

      await expect(client.volumeDown(playerId)).rejects.toThrow("Volume down failed");
    });
  });

  describe("volumeMute", () => {
    it("should call playerCommandVolumeMute API method with correct parameters", async () => {
      const playerId = "test-player-mute";
      const muted = true;
      const mockApi = {
        playerCommandVolumeMute: jest.fn().mockResolvedValue(undefined),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      await client.volumeMute(playerId, muted);

      expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
      expect(mockApi.playerCommandVolumeMute).toHaveBeenCalledWith(playerId, muted);
    });

    it("should handle unmute (muted=false) correctly", async () => {
      const playerId = "test-player-mute";
      const muted = false;
      const mockApi = {
        playerCommandVolumeMute: jest.fn().mockResolvedValue(undefined),
      };

      mockExecuteApiCommand.mockImplementation(async (command) => {
        return command(mockApi as any);
      });

      await client.volumeMute(playerId, muted);

      expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
      expect(mockApi.playerCommandVolumeMute).toHaveBeenCalledWith(playerId, false);
    });

    it("should handle errors from API command", async () => {
      const playerId = "test-player-mute";
      const error = new Error("Volume mute failed");

      mockExecuteApiCommand.mockRejectedValue(error);

      await expect(client.volumeMute(playerId, true)).rejects.toThrow("Volume mute failed");
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
      it("should return current item name when available and playing", () => {
        const queue = createMockQueue("queue1", "Living Room", PlayerState.PLAYING, "Great Song");

        const result = client.getDisplayTitle(queue);

        expect(result).toBe("Great Song");
      });

      it("should return undefined when not playing even if a current item exists", () => {
        const queue = createMockQueue("queue1", "Living Room", PlayerState.PAUSED, "Paused Song");

        const result = client.getDisplayTitle(queue);

        expect(result).toBeUndefined();
      });

      it("should return undefined when no current item", () => {
        const queue = createMockQueue("queue1", "Living Room", PlayerState.IDLE);

        const result = client.getDisplayTitle(queue);

        expect(result).toBeUndefined();
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
      const originalPlatform = process.platform;

      afterEach(() => {
        Object.defineProperty(process, "platform", {
          value: originalPlatform,
          writable: true,
        });
      });

      it("should format message with menubar reference on macOS", () => {
        Object.defineProperty(process, "platform", {
          value: "darwin",
          writable: true,
        });
        const result = client.formatSelectionMessage("Bedroom");
        expect(result).toBe("Bedroom selected, allow 10 seconds for the menubar to update!");
      });

      it("should format message without menubar reference on Windows", () => {
        Object.defineProperty(process, "platform", {
          value: "win32",
          writable: true,
        });
        const result = client.formatSelectionMessage("Kitchen");
        expect(result).toBe("Kitchen selected!");
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

    describe("supportsMuteControl", () => {
      it("should return true when player has absolute mute control", () => {
        const player = { player_id: "test", mute_control: "absolute" } as any;
        const result = client.supportsMuteControl(player);
        expect(result).toBe(true);
      });

      it("should return false when player has no mute control", () => {
        const player = { player_id: "test", mute_control: "none" } as any;
        const result = client.supportsMuteControl(player);
        expect(result).toBe(false);
      });

      it("should return false when player is undefined", () => {
        const result = client.supportsMuteControl(undefined);
        expect(result).toBe(false);
      });

      it("should return false when mute_control is undefined", () => {
        const player = { player_id: "test" } as any;
        const result = client.supportsMuteControl(player);
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

  describe("Player Grouping Methods", () => {
    describe("setGroupMembers", () => {
      it("should call playerCommandSetMembers with all parameters", async () => {
        const mockApi = {
          playerCommandSetMembers: jest.fn().mockResolvedValue(undefined),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.setGroupMembers("leader-1", ["member-1"], ["member-2"]);

        expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
        expect(mockApi.playerCommandSetMembers).toHaveBeenCalledWith("leader-1", ["member-1"], ["member-2"]);
      });

      it("should handle errors from API command", async () => {
        const error = new Error("Incompatible players");
        mockExecuteApiCommand.mockRejectedValue(error);

        await expect(client.setGroupMembers("leader-1", ["member-1"])).rejects.toThrow("Incompatible players");
      });
    });

    describe("groupPlayer", () => {
      it("should call playerCommandGroup with correct parameters", async () => {
        const mockApi = {
          playerCommandGroup: jest.fn().mockResolvedValue(undefined),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.groupPlayer("player-1", "leader-1");

        expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
        expect(mockApi.playerCommandGroup).toHaveBeenCalledWith("player-1", "leader-1");
      });

      it("should handle errors from API command", async () => {
        const error = new Error("Player already grouped");
        mockExecuteApiCommand.mockRejectedValue(error);

        await expect(client.groupPlayer("player-1", "leader-1")).rejects.toThrow("Player already grouped");
      });
    });

    describe("ungroupPlayer", () => {
      it("should call playerCommandUnGroup with correct player ID", async () => {
        const mockApi = {
          playerCommandUnGroup: jest.fn().mockResolvedValue(undefined),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.ungroupPlayer("player-1");

        expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
        expect(mockApi.playerCommandUnGroup).toHaveBeenCalledWith("player-1");
      });

      it("should handle errors from API command", async () => {
        const error = new Error("Ungroup failed");
        mockExecuteApiCommand.mockRejectedValue(error);

        await expect(client.ungroupPlayer("player-1")).rejects.toThrow("Ungroup failed");
      });
    });

    describe("canFormGroup", () => {
      it("should return true when player has compatible players", () => {
        const player = { player_id: "test", can_group_with: ["player-1", "player-2"] } as any;
        expect(client.canFormGroup(player)).toBe(true);
      });

      it("should return false when can_group_with is empty", () => {
        const player = { player_id: "test", can_group_with: [] } as any;
        expect(client.canFormGroup(player)).toBe(false);
      });

      it("should return false when player is undefined", () => {
        expect(client.canFormGroup(undefined)).toBe(false);
      });
    });

    describe("isGroupLeader", () => {
      it("should return true when player has group children", () => {
        const player = { player_id: "test", group_childs: ["child-1", "child-2"] } as any;
        expect(client.isGroupLeader(player)).toBe(true);
      });

      it("should return false when group_childs is empty", () => {
        const player = { player_id: "test", group_childs: [] } as any;
        expect(client.isGroupLeader(player)).toBe(false);
      });

      it("should return false when player is undefined", () => {
        expect(client.isGroupLeader(undefined)).toBe(false);
      });
    });

    describe("getGroupStatus", () => {
      it("should return Leader when player has group children", () => {
        const player = { player_id: "test", group_childs: ["child-1"], synced_to: undefined } as any;
        expect(client.getGroupStatus(player)).toBe("Leader");
      });

      it("should return Member when player has synced_to", () => {
        const player = { player_id: "test", group_childs: [], synced_to: "leader-1" } as any;
        expect(client.getGroupStatus(player)).toBe("Member");
      });

      it("should return Member when player has active_group", () => {
        const player = { player_id: "test", group_childs: [], active_group: "group-1" } as any;
        expect(client.getGroupStatus(player)).toBe("Member");
      });

      it("should return Standalone when player is not grouped", () => {
        const player = { player_id: "test", group_childs: [], synced_to: undefined, active_group: undefined } as any;
        expect(client.getGroupStatus(player)).toBe("Standalone");
      });

      it("should return Standalone when player is undefined", () => {
        expect(client.getGroupStatus(undefined)).toBe("Standalone");
      });
    });

    describe("getCompatiblePlayers", () => {
      it("should return only players with shared grouping providers", () => {
        const targetPlayer = {
          player_id: "leader-1",
          can_group_with: ["airplay", "sonos"],
        } as any;

        const allPlayers = [
          { player_id: "player-1", can_group_with: ["airplay"], available: true, enabled: true },
          { player_id: "player-2", can_group_with: ["sonos"], available: false, enabled: true },
          { player_id: "player-3", can_group_with: ["airplay"], available: true, enabled: false },
          { player_id: "player-4", can_group_with: ["chromecast"], available: true, enabled: true },
          { player_id: "leader-1", can_group_with: ["airplay", "sonos"], available: true, enabled: true },
        ] as any[];

        const compatible = client.getCompatiblePlayers(targetPlayer, allPlayers);

        expect(compatible).toHaveLength(1);
        expect(compatible[0].player_id).toBe("player-1");
      });

      it("should exclude target player from compatible list", () => {
        const targetPlayer = {
          player_id: "leader-1",
          can_group_with: ["airplay"],
        } as any;

        const allPlayers = [
          { player_id: "leader-1", can_group_with: ["airplay"], available: true, enabled: true },
          { player_id: "player-1", can_group_with: ["airplay"], available: true, enabled: true },
        ] as any[];

        const compatible = client.getCompatiblePlayers(targetPlayer, allPlayers);

        expect(compatible).toHaveLength(1);
        expect(compatible[0].player_id).toBe("player-1");
      });

      it("should return empty array when no compatible players", () => {
        const targetPlayer = {
          player_id: "leader-1",
          can_group_with: ["airplay"],
        } as any;

        const allPlayers = [
          { player_id: "player-1", can_group_with: ["chromecast"], available: true, enabled: true },
        ] as any[];

        const compatible = client.getCompatiblePlayers(targetPlayer, allPlayers);

        expect(compatible).toHaveLength(0);
      });
    });

    describe("getGroupMemberOptions", () => {
      it("should return current members and exclude them from potential members", () => {
        const targetPlayer = {
          player_id: "leader-1",
          group_childs: ["member-1"],
          can_group_with: ["airplay"],
        } as any;

        const allPlayers = [
          targetPlayer,
          { player_id: "member-1", can_group_with: ["airplay"], available: true, enabled: true },
          { player_id: "member-2", can_group_with: ["airplay"], available: true, enabled: true },
        ] as any[];

        const result = client.getGroupMemberOptions(targetPlayer, allPlayers);

        expect(result.currentMembers.map((p) => p.player_id)).toEqual(["member-1"]);
        expect(result.potentialMembers.map((p) => p.player_id)).toEqual(["member-2"]);
      });

      it("should return only potential members when group has no members", () => {
        const targetPlayer = {
          player_id: "leader-1",
          group_childs: [],
          can_group_with: ["airplay"],
        } as any;

        const allPlayers = [
          targetPlayer,
          { player_id: "member-2", can_group_with: ["airplay"], available: true, enabled: true },
        ] as any[];

        const result = client.getGroupMemberOptions(targetPlayer, allPlayers);

        expect(result.currentMembers).toEqual([]);
        expect(result.potentialMembers.map((p) => p.player_id)).toEqual(["member-2"]);
      });
    });

    describe("getVolumeControlPlayer", () => {
      it("should return the synced_to player ID when player is a group member", () => {
        const member = {
          player_id: "member-1",
          synced_to: "leader-1",
          group_childs: [],
        } as any;

        expect(client.getVolumeControlPlayer(member)).toBe("leader-1");
      });

      it("should return the active_group when synced_to is not set", () => {
        const member = {
          player_id: "member-1",
          synced_to: undefined,
          active_group: "group-1",
          group_childs: [],
        } as any;

        expect(client.getVolumeControlPlayer(member)).toBe("group-1");
      });

      it("should return the player's own ID when player is standalone", () => {
        const standalone = {
          player_id: "speaker-1",
          synced_to: undefined,
          active_group: undefined,
          group_childs: [],
        } as any;

        expect(client.getVolumeControlPlayer(standalone)).toBe("speaker-1");
      });

      it("should return the player's own ID when player is a group leader", () => {
        const leader = {
          player_id: "leader-1",
          synced_to: undefined,
          group_childs: ["member-1", "member-2"],
        } as any;

        expect(client.getVolumeControlPlayer(leader)).toBe("leader-1");
      });

      it("should return undefined when player is undefined", () => {
        expect(client.getVolumeControlPlayer(undefined)).toBeUndefined();
      });
    });

    describe("syncMembersWithLeader", () => {
      it("should sync all members' volumes to match leader volume", async () => {
        const leader = {
          player_id: "leader-1",
          volume_level: 75,
          group_childs: ["member-1", "member-2"],
        } as any;

        const member1 = { player_id: "member-1", volume_level: 50 } as any;
        const member2 = { player_id: "member-2", volume_level: 30 } as any;
        const allPlayers = [leader, member1, member2];

        const mockSetVolume = jest.spyOn(client, "setVolume").mockResolvedValue(undefined);
        const mockGetGroupMembers = jest.spyOn(client, "getGroupMembers").mockReturnValue([leader, member1, member2]);

        await client.syncMembersWithLeader(leader, allPlayers);

        expect(mockGetGroupMembers).toHaveBeenCalledWith(leader, allPlayers);
        expect(mockSetVolume).toHaveBeenCalledWith("member-1", 75);
        expect(mockSetVolume).toHaveBeenCalledWith("member-2", 75);
        expect(mockSetVolume).toHaveBeenCalledTimes(2);

        mockSetVolume.mockRestore();
        mockGetGroupMembers.mockRestore();
      });

      it("should throw error when player is not a group leader", async () => {
        const standalone = {
          player_id: "speaker-1",
          group_childs: [],
        } as any;

        const allPlayers = [standalone];

        await expect(client.syncMembersWithLeader(standalone, allPlayers)).rejects.toThrow(
          "Player is not a group leader",
        );
      });

      it("should handle empty members list gracefully", async () => {
        const leader = {
          player_id: "leader-1",
          volume_level: 75,
          group_childs: ["member-1"],
        } as any;

        const member = {
          player_id: "member-1",
          volume_level: 50,
        } as any;

        const allPlayers = [leader, member];

        const mockGetGroupMembers = jest.spyOn(client, "getGroupMembers").mockReturnValue([leader]);
        const mockSetVolume = jest.spyOn(client, "setVolume").mockResolvedValue(undefined);

        await client.syncMembersWithLeader(leader, allPlayers);

        expect(mockGetGroupMembers).toHaveBeenCalledWith(leader, allPlayers);
        expect(mockSetVolume).not.toHaveBeenCalled();

        mockGetGroupMembers.mockRestore();
        mockSetVolume.mockRestore();
      });
    });
  });

  // Menu Bar Display Logic Tests
  describe("isDisplayablePlayer", () => {
    it("should return true for group leaders with members", () => {
      const groupLeader = {
        player_id: "leader-1",
        group_childs: ["member-1", "member-2"],
        synced_to: undefined,
      } as any;

      expect(client.isDisplayablePlayer(groupLeader)).toBe(true);
    });

    it("should return true for standalone players without sync", () => {
      const standalone = {
        player_id: "player-1",
        group_childs: [],
        synced_to: undefined,
      } as any;

      expect(client.isDisplayablePlayer(standalone)).toBe(true);
    });

    it("should return false for group members that are synced", () => {
      const groupMember = {
        player_id: "member-1",
        group_childs: [],
        synced_to: "leader-1",
      } as any;

      expect(client.isDisplayablePlayer(groupMember)).toBe(false);
    });

    it("should return false for group members with empty group_childs", () => {
      const groupMember = {
        player_id: "member-1",
        group_childs: [],
        synced_to: "leader-1",
      } as any;

      expect(client.isDisplayablePlayer(groupMember)).toBe(false);
    });
  });

  describe("getDisplayableQueues", () => {
    it("should filter to only group leaders and standalone players", () => {
      const queues: PlayerQueue[] = [
        { queue_id: "leader-1", display_name: "Leader" } as any,
        { queue_id: "member-1", display_name: "Member" } as any,
        { queue_id: "standalone-1", display_name: "Standalone" } as any,
      ];

      const players = [
        { player_id: "leader-1", group_childs: ["member-1"], synced_to: undefined },
        { player_id: "member-1", group_childs: [], synced_to: "leader-1" },
        { player_id: "standalone-1", group_childs: [], synced_to: undefined },
      ] as any[];

      const displayable = client.getDisplayableQueues(queues, players);

      expect(displayable).toHaveLength(2);
      expect(displayable.map((q) => q.queue_id)).toEqual(["leader-1", "standalone-1"]);
    });

    it("should return empty array when all are group members", () => {
      const queues: PlayerQueue[] = [
        { queue_id: "member-1", display_name: "Member 1" } as any,
        { queue_id: "member-2", display_name: "Member 2" } as any,
      ];

      const players = [
        { player_id: "member-1", group_childs: [], synced_to: "leader" },
        { player_id: "member-2", group_childs: [], synced_to: "leader" },
      ] as any[];

      const displayable = client.getDisplayableQueues(queues, players);

      expect(displayable).toHaveLength(0);
    });

    it("should handle queues with no matching player", () => {
      const queues: PlayerQueue[] = [
        { queue_id: "leader-1", display_name: "Leader" } as any,
        { queue_id: "unknown-1", display_name: "Unknown" } as any,
      ];

      const players = [{ player_id: "leader-1", group_childs: [], synced_to: undefined }] as any[];

      const displayable = client.getDisplayableQueues(queues, players);

      expect(displayable).toHaveLength(1);
      expect(displayable[0].queue_id).toBe("leader-1");
    });
  });

  describe("getDisplayQueueForMenuBar", () => {
    it("should return undefined when activeQueue is undefined", () => {
      const result = client.getDisplayQueueForMenuBar(undefined, [], []);
      expect(result).toBeUndefined();
    });

    it("should return displayable activeQueue as-is", () => {
      const activeQueue: PlayerQueue = { queue_id: "leader-1", display_name: "Leader" } as any;
      const players = [{ player_id: "leader-1", group_childs: ["member-1"], synced_to: undefined }] as any[];

      const result = client.getDisplayQueueForMenuBar(activeQueue, players, []);

      expect(result).toBe(activeQueue);
    });

    it("should return the group leader queue when activeQueue is a group member", () => {
      const activeQueue: PlayerQueue = { queue_id: "member-1", display_name: "Member" } as any;
      const players = [
        { player_id: "member-1", group_childs: [], synced_to: "leader-1" },
        { player_id: "leader-1", group_childs: ["member-1"], synced_to: undefined },
      ] as any[];

      const queues: PlayerQueue[] = [
        { queue_id: "member-1" } as any,
        { queue_id: "leader-1", display_name: "Leader" } as any,
      ];

      const result = client.getDisplayQueueForMenuBar(activeQueue, players, queues);

      expect(result?.queue_id).toBe("leader-1");
    });

    it("should return activeQueue when player not found in players list", () => {
      const activeQueue: PlayerQueue = { queue_id: "unknown-1", display_name: "Unknown" } as any;
      const players: any[] = [];

      const result = client.getDisplayQueueForMenuBar(activeQueue, players, []);

      expect(result).toBe(activeQueue);
    });

    it("should return activeQueue when member has no synced_to", () => {
      const activeQueue: PlayerQueue = { queue_id: "player-1", display_name: "Player" } as any;
      const players = [{ player_id: "player-1", group_childs: [], synced_to: undefined }] as any[];

      const result = client.getDisplayQueueForMenuBar(activeQueue, players, []);

      expect(result).toBe(activeQueue);
    });

    it("should return activeQueue when synced group leader queue not found", () => {
      const activeQueue: PlayerQueue = { queue_id: "member-1", display_name: "Member" } as any;
      const players = [{ player_id: "member-1", group_childs: [], synced_to: "missing-leader" }] as any[];

      const result = client.getDisplayQueueForMenuBar(activeQueue, players, []);

      expect(result).toBe(activeQueue);
    });
  });

  describe("getCurrentlyPlayingSong", () => {
    it("should return formatted song with title and artist", () => {
      const player = {
        current_media: {
          title: "Bohemian Rhapsody",
          artist: "Queen",
        },
      } as any;

      const song = client.getCurrentlyPlayingSong(player);

      expect(song).toBe("Bohemian Rhapsody - Queen");
    });

    it("should return only title when artist is missing", () => {
      const player = {
        current_media: {
          title: "Song Title",
        },
      } as any;

      const song = client.getCurrentlyPlayingSong(player);

      expect(song).toBe("Song Title");
    });

    it("should return empty string when current_media is undefined", () => {
      const player = {
        current_media: undefined,
      } as any;

      const song = client.getCurrentlyPlayingSong(player);

      expect(song).toBe("");
    });

    it("should return empty string when title is missing", () => {
      const player = {
        current_media: {
          artist: "Artist Name",
        },
      } as any;

      const song = client.getCurrentlyPlayingSong(player);

      expect(song).toBe("");
    });

    it("should handle undefined player", () => {
      const song = client.getCurrentlyPlayingSong(undefined);

      expect(song).toBe("");
    });

    it("should handle null current_media", () => {
      const player = {
        current_media: null,
      } as any;

      const song = client.getCurrentlyPlayingSong(player);

      expect(song).toBe("");
    });
  });

  describe("getQueueCurrentSong", () => {
    it("should return current item name from queue", () => {
      const queue = {
        current_item: {
          name: "Blinding Lights",
        },
      } as any;

      const song = client.getQueueCurrentSong(queue);

      expect(song).toBe("Blinding Lights");
    });

    it("should return empty string when current_item is undefined", () => {
      const queue = {
        current_item: undefined,
      } as any;

      const song = client.getQueueCurrentSong(queue);

      expect(song).toBe("");
    });

    it("should return empty string when queue is undefined", () => {
      const song = client.getQueueCurrentSong(undefined);

      expect(song).toBe("");
    });

    it("should return empty string when current_item is null", () => {
      const queue = {
        current_item: null,
      } as any;

      const song = client.getQueueCurrentSong(queue);

      expect(song).toBe("");
    });

    it("should handle queue with no current_item property", () => {
      const queue = {} as any;

      const song = client.getQueueCurrentSong(queue);

      expect(song).toBe("");
    });
  });

  describe("getPlayerAlbumArt", () => {
    it("should return full URL when player has image_url", () => {
      const player = {
        current_media: {
          image_url: "/imageproxy/abc123",
        },
      } as any;

      const artUrl = client.getPlayerAlbumArt(player);

      expect(artUrl).toBeDefined();
      expect(artUrl).toContain("/imageproxy/abc123");
    });

    it("should handle absolute URLs from player", () => {
      const player = {
        current_media: {
          image_url: "http://example.com/image.jpg",
        },
      } as any;

      const artUrl = client.getPlayerAlbumArt(player);

      expect(artUrl).toBe("http://example.com/image.jpg");
    });

    it("should return undefined when player has no current_media", () => {
      const player = {
        current_media: undefined,
      } as any;

      const artUrl = client.getPlayerAlbumArt(player);

      expect(artUrl).toBeUndefined();
    });

    it("should return undefined when current_media has no image_url", () => {
      const player = {
        current_media: {
          title: "Song",
        },
      } as any;

      const artUrl = client.getPlayerAlbumArt(player);

      expect(artUrl).toBeUndefined();
    });

    it("should handle undefined player", () => {
      const artUrl = client.getPlayerAlbumArt(undefined);

      expect(artUrl).toBeUndefined();
    });
  });

  describe("getQueueAlbumArt", () => {
    it("should return full URL when queue has image path", () => {
      const queue = {
        current_item: {
          image: {
            path: "/imageproxy/xyz789",
          },
        },
      } as any;

      const artUrl = client.getQueueAlbumArt(queue);

      expect(artUrl).toBeDefined();
      expect(artUrl).toContain("/imageproxy/xyz789");
    });

    it("should handle absolute URLs from queue", () => {
      const queue = {
        current_item: {
          image: {
            path: "https://cdn.example.com/cover.jpg",
          },
        },
      } as any;

      const artUrl = client.getQueueAlbumArt(queue);

      expect(artUrl).toBe("https://cdn.example.com/cover.jpg");
    });

    it("should return undefined when queue has no current_item", () => {
      const queue = {
        current_item: undefined,
      } as any;

      const artUrl = client.getQueueAlbumArt(queue);

      expect(artUrl).toBeUndefined();
    });

    it("should return undefined when current_item has no image", () => {
      const queue = {
        current_item: {
          name: "Song",
        },
      } as any;

      const artUrl = client.getQueueAlbumArt(queue);

      expect(artUrl).toBeUndefined();
    });

    it("should return undefined when image has no path", () => {
      const queue = {
        current_item: {
          image: {},
        },
      } as any;

      const artUrl = client.getQueueAlbumArt(queue);

      expect(artUrl).toBeUndefined();
    });

    it("should handle undefined queue", () => {
      const artUrl = client.getQueueAlbumArt(undefined);

      expect(artUrl).toBeUndefined();
    });
  });

  describe("getGroupMembers", () => {
    it("should return empty array for standalone players", () => {
      const player = {
        player_id: "standalone-1",
        group_childs: [],
      } as any;

      const members = client.getGroupMembers(player, []);

      expect(members).toHaveLength(0);
    });

    it("should return empty array when group_childs is undefined", () => {
      const player = {
        player_id: "player-1",
        group_childs: undefined,
      } as any;

      const members = client.getGroupMembers(player, []);

      expect(members).toHaveLength(0);
    });

    it("should return all group members for a group leader", () => {
      const groupLeader = {
        player_id: "leader-1",
        group_childs: ["member-1", "member-2"],
      } as any;

      const allPlayers = [
        { player_id: "leader-1", display_name: "Leader" },
        { player_id: "member-1", display_name: "Member 1" },
        { player_id: "member-2", display_name: "Member 2" },
      ] as any[];

      const members = client.getGroupMembers(groupLeader, allPlayers);

      expect(members).toHaveLength(2);
      expect(members[0].player_id).toBe("member-1");
      expect(members[1].player_id).toBe("member-2");
    });

    it("should filter out members that are not found in allPlayers", () => {
      const groupLeader = {
        player_id: "leader-1",
        group_childs: ["member-1", "missing-member"],
      } as any;

      const allPlayers = [
        { player_id: "leader-1", display_name: "Leader" },
        { player_id: "member-1", display_name: "Member 1" },
      ] as any[];

      const members = client.getGroupMembers(groupLeader, allPlayers);

      expect(members).toHaveLength(1);
      expect(members[0].player_id).toBe("member-1");
    });

    it("should preserve member order from group_childs", () => {
      const groupLeader = {
        player_id: "leader-1",
        group_childs: ["member-3", "member-1", "member-2"],
      } as any;

      const allPlayers = [
        { player_id: "leader-1", display_name: "Leader" },
        { player_id: "member-1", display_name: "Member 1" },
        { player_id: "member-2", display_name: "Member 2" },
        { player_id: "member-3", display_name: "Member 3" },
      ] as any[];

      const members = client.getGroupMembers(groupLeader, allPlayers);

      expect(members).toHaveLength(3);
      expect(members[0].player_id).toBe("member-3");
      expect(members[1].player_id).toBe("member-1");
      expect(members[2].player_id).toBe("member-2");
    });
  });

  // Library and Search Methods Tests
  describe("Library and Search Methods", () => {
    describe("search", () => {
      it("should call search API with correct parameters", async () => {
        const mockResults = {
          artists: [{ item_id: "artist-1", name: "Test Artist" }],
          albums: [],
          tracks: [],
          playlists: [],
          radio: [],
          podcasts: [],
          audiobooks: [],
        };
        const mockApi = {
          search: jest.fn().mockResolvedValue(mockResults),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const result = await client.search("test query", 50);

        expect(mockExecuteApiCommand).toHaveBeenCalledTimes(1);
        expect(mockApi.search).toHaveBeenCalledWith("test query", undefined, 50);
        expect(result).toEqual(mockResults);
      });

      it("should use default limit when not provided", async () => {
        const mockApi = {
          search: jest.fn().mockResolvedValue({
            artists: [],
            albums: [],
            tracks: [],
            playlists: [],
            radio: [],
            podcasts: [],
            audiobooks: [],
          }),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.search("test");

        expect(mockApi.search).toHaveBeenCalledWith("test", undefined, 50);
      });
    });

    describe("getItemByUri", () => {
      it("should fetch media item by URI", async () => {
        const mockItem = { item_id: "track-123", uri: "spotify://track/123", name: "Test Track" };
        const mockApi = {
          getItemByUri: jest.fn().mockResolvedValue(mockItem),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const result = await client.getItemByUri("spotify://track/123");

        expect(mockApi.getItemByUri).toHaveBeenCalledWith("spotify://track/123");
        expect(result).toEqual(mockItem);
      });

      it("should propagate API errors when fetching item by URI", async () => {
        const mockApi = {
          getItemByUri: jest.fn().mockRejectedValue(new Error("item lookup failed")),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await expect(client.getItemByUri("spotify://track/123")).rejects.toThrow("item lookup failed");
      });
    });

    describe("favorites", () => {
      it("should add an item to favorites", async () => {
        const mockTrack = { item_id: "track-123", media_type: "track", favorite: false } as any;
        const mockApi = {
          addItemToFavorites: jest.fn().mockResolvedValue(undefined),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.addToFavorites(mockTrack);

        expect(mockApi.addItemToFavorites).toHaveBeenCalledWith(mockTrack);
      });

      it("should remove an item from favorites", async () => {
        const mockTrack = { item_id: "track-123", media_type: "track", favorite: true } as any;
        const mockApi = {
          removeItemFromFavorites: jest.fn().mockResolvedValue(undefined),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.removeFromFavorites(mockTrack);

        expect(mockApi.removeItemFromFavorites).toHaveBeenCalledWith("track", "track-123");
      });

      it("should toggle favorite on when item is not currently favorite", async () => {
        const mockTrack = { item_id: "track-123", media_type: "track", favorite: false } as any;
        const mockApi = {
          addItemToFavorites: jest.fn().mockResolvedValue(undefined),
          removeItemFromFavorites: jest.fn().mockResolvedValue(undefined),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const isNowFavorite = await client.toggleFavorite(mockTrack);

        expect(isNowFavorite).toBe(true);
        expect(mockApi.addItemToFavorites).toHaveBeenCalledWith(mockTrack);
        expect(mockApi.removeItemFromFavorites).not.toHaveBeenCalled();
      });

      it("should toggle favorite off when item is currently favorite", async () => {
        const mockTrack = { item_id: "track-123", media_type: "track", favorite: true } as any;
        const mockApi = {
          addItemToFavorites: jest.fn().mockResolvedValue(undefined),
          removeItemFromFavorites: jest.fn().mockResolvedValue(undefined),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const isNowFavorite = await client.toggleFavorite(mockTrack);

        expect(isNowFavorite).toBe(false);
        expect(mockApi.removeItemFromFavorites).toHaveBeenCalledWith("track", "track-123");
        expect(mockApi.addItemToFavorites).not.toHaveBeenCalled();
      });

      it("should propagate API errors when removing favorites", async () => {
        const mockTrack = { item_id: "track-123", media_type: "track", favorite: true } as any;
        const mockApi = {
          removeItemFromFavorites: jest.fn().mockRejectedValue(new Error("remove favorites failed")),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await expect(client.toggleFavorite(mockTrack)).rejects.toThrow("remove favorites failed");
      });
    });

    describe("getLibraryArtists", () => {
      it("should fetch library artists with pagination", async () => {
        const mockArtists = [
          { item_id: "artist-1", name: "Artist 1" },
          { item_id: "artist-2", name: "Artist 2" },
        ];
        const mockApi = {
          getLibraryArtists: jest.fn().mockResolvedValue(mockArtists),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const result = await client.getLibraryArtists("rock", 20, 10);

        expect(mockApi.getLibraryArtists).toHaveBeenCalledWith(undefined, "rock", 20, 10);
        expect(result).toEqual(mockArtists);
      });

      it("should use default pagination parameters", async () => {
        const mockApi = {
          getLibraryArtists: jest.fn().mockResolvedValue([]),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.getLibraryArtists();

        expect(mockApi.getLibraryArtists).toHaveBeenCalledWith(undefined, undefined, 20, 0);
      });
    });

    describe("getLibraryAlbums", () => {
      it("should fetch library albums with search and pagination", async () => {
        const mockAlbums = [{ item_id: "album-1", name: "Album 1" }];
        const mockApi = {
          getLibraryAlbums: jest.fn().mockResolvedValue(mockAlbums),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const result = await client.getLibraryAlbums("best of", 10, 5);

        expect(mockApi.getLibraryAlbums).toHaveBeenCalledWith(undefined, "best of", 10, 5);
        expect(result).toEqual(mockAlbums);
      });
    });

    describe("getLibraryPlaylists", () => {
      it("should fetch library playlists", async () => {
        const mockPlaylists = [{ item_id: "playlist-1", name: "My Playlist" }];
        const mockApi = {
          getLibraryPlaylists: jest.fn().mockResolvedValue(mockPlaylists),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const result = await client.getLibraryPlaylists();

        expect(mockApi.getLibraryPlaylists).toHaveBeenCalledWith(undefined, undefined, 20, 0);
        expect(result).toEqual(mockPlaylists);
      });
    });

    describe("getArtistAlbums", () => {
      it("should fetch albums for a specific artist", async () => {
        const mockAlbums = [{ item_id: "album-1", name: "Album 1" }];
        const mockApi = {
          getArtistAlbums: jest.fn().mockResolvedValue(mockAlbums),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const result = await client.getArtistAlbums("artist-123", "library");

        expect(mockApi.getArtistAlbums).toHaveBeenCalledWith("artist-123", "library", true);
        expect(result).toEqual(mockAlbums);
      });
    });

    describe("getAlbumTracks", () => {
      it("should fetch tracks for a specific album", async () => {
        const mockTracks = [{ item_id: "track-1", name: "Track 1" }];
        const mockApi = {
          getAlbumTracks: jest.fn().mockResolvedValue(mockTracks),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const result = await client.getAlbumTracks("album-123", "library");

        expect(mockApi.getAlbumTracks).toHaveBeenCalledWith("album-123", "library", true);
        expect(result).toEqual(mockTracks);
      });
    });

    describe("getPlaylistTracks", () => {
      it("should fetch tracks for a specific playlist", async () => {
        const mockTracks = [{ item_id: "track-1", name: "Track 1" }];
        const mockApi = {
          getPlaylistTracks: jest.fn().mockResolvedValue(mockTracks),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const result = await client.getPlaylistTracks("playlist-123", "library");

        expect(mockApi.getPlaylistTracks).toHaveBeenCalledWith("playlist-123", "library", false);
        expect(result).toEqual(mockTracks);
      });
    });

    describe("getRecentlyPlayedItems", () => {
      it("should fetch recently played items with default limit", async () => {
        const mockItems = [
          { item_id: "item-1", name: "Recently Played 1" },
          { item_id: "item-2", name: "Recently Played 2" },
        ];
        const mockApi = {
          getRecentlyPlayedItems: jest.fn().mockResolvedValue(mockItems),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const result = await client.getRecentlyPlayedItems();

        expect(mockApi.getRecentlyPlayedItems).toHaveBeenCalledWith(30);
        expect(result).toEqual(mockItems);
      });

      it("should fetch recently played items with custom limit", async () => {
        const mockApi = {
          getRecentlyPlayedItems: jest.fn().mockResolvedValue([]),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.getRecentlyPlayedItems(50);

        expect(mockApi.getRecentlyPlayedItems).toHaveBeenCalledWith(50);
      });
    });

    describe("getPlayerQueueItems", () => {
      it("should fetch queue items with pagination", async () => {
        const mockItems = [
          { queue_item_id: "item-1", name: "Track 1" },
          { queue_item_id: "item-2", name: "Track 2" },
        ];
        const mockApi = {
          getPlayerQueueItems: jest.fn().mockResolvedValue(mockItems),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const result = await client.getPlayerQueueItems("queue-123", 50, 10);

        expect(mockApi.getPlayerQueueItems).toHaveBeenCalledWith("queue-123", 50, 10);
        expect(result).toEqual(mockItems);
      });

      it("should use default pagination parameters", async () => {
        const mockApi = {
          getPlayerQueueItems: jest.fn().mockResolvedValue([]),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.getPlayerQueueItems("queue-123");

        expect(mockApi.getPlayerQueueItems).toHaveBeenCalledWith("queue-123", 100, 0);
      });
    });

    describe("playMedia", () => {
      it("should play media on queue with NEXT option by default", async () => {
        const mockTrack = { item_id: "track-1", name: "Test Track" };
        const mockApi = {
          playMedia: jest.fn().mockResolvedValue(undefined),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.playMedia(mockTrack as any, "queue-123");

        expect(mockApi.playMedia).toHaveBeenCalledWith(mockTrack, "next", false, undefined, "queue-123");
      });

      it("should play media with custom queue option", async () => {
        const mockTrack = { item_id: "track-1", name: "Test Track" };
        const mockApi = {
          playMedia: jest.fn().mockResolvedValue(undefined),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.playMedia(mockTrack as any, "queue-123", "add" as any);

        expect(mockApi.playMedia).toHaveBeenCalledWith(mockTrack, "add", false, undefined, "queue-123");
      });
    });

    describe("queue helper methods", () => {
      it("should add media to queue with NEXT option", async () => {
        const mockTrack = { item_id: "track-1", name: "Test Track" };
        const mockApi = {
          playMedia: jest.fn().mockResolvedValue(undefined),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.addToQueueNext(mockTrack as any, "queue-123");

        expect(mockApi.playMedia).toHaveBeenCalledWith(mockTrack, "next", false, undefined, "queue-123");
      });

      it("should format add-to-queue message", () => {
        expect(client.formatAddToQueueNextMessage("Track Name")).toBe('"Track Name" will play next');
      });

      it("should format duration for empty and non-empty values", () => {
        expect(client.formatDuration(undefined)).toBe("0:00");
        expect(client.formatDuration(0)).toBe("0:00");
        expect(client.formatDuration(125)).toBe("2:05");
      });

      it("should map move directions to API position shifts", () => {
        expect(client.getQueueMovePositionShift("up")).toBe(-1);
        expect(client.getQueueMovePositionShift("down")).toBe(1);
        expect(client.getQueueMovePositionShift("next")).toBe(0);
      });

      it("should return move feedback text for each direction", () => {
        expect(client.getQueueMoveFeedback("up")).toBe("Moved up");
        expect(client.getQueueMoveFeedback("down")).toBe("Moved down");
        expect(client.getQueueMoveFeedback("next")).toBe("Moved to next");
      });

      it("should cycle repeat mode OFF -> ALL -> ONE -> OFF", () => {
        expect(client.getNextRepeatMode(RepeatMode.OFF)).toBe(RepeatMode.ALL);
        expect(client.getNextRepeatMode(RepeatMode.ALL)).toBe(RepeatMode.ONE);
        expect(client.getNextRepeatMode(RepeatMode.ONE)).toBe(RepeatMode.OFF);
      });

      it("should return next repeat mode labels", () => {
        expect(client.getNextRepeatModeLabel(RepeatMode.OFF)).toBe("ONE");
        expect(client.getNextRepeatModeLabel(RepeatMode.ONE)).toBe("ALL");
        expect(client.getNextRepeatModeLabel(RepeatMode.ALL)).toBe("OFF");
      });

      it("should return shuffle display text", () => {
        expect(client.getShuffleText(true)).toBe("Shuffle: ON");
        expect(client.getShuffleText(false)).toBe("Shuffle: OFF");
      });

      it("should return repeat display text", () => {
        expect(client.getRepeatText(RepeatMode.OFF)).toBe("Repeat: OFF");
        expect(client.getRepeatText(RepeatMode.ONE)).toBe("Repeat: ONE");
        expect(client.getRepeatText(RepeatMode.ALL)).toBe("Repeat: ALL");
      });

      it("should format current media title with artist", () => {
        const text = client.formatCurrentMediaTitle({ title: "Song", artist: "Artist" } as any, "Fallback");
        expect(text).toBe("Song - Artist");
      });

      it("should format current media title without artist and with fallback", () => {
        expect(client.formatCurrentMediaTitle({ title: "Song" } as any, "Fallback")).toBe("Song");
        expect(client.formatCurrentMediaTitle(undefined, "Fallback")).toBe("Fallback");
      });

      it("should format volume transition feedback", () => {
        expect(client.formatVolumeTransition(40, 50)).toBe("Volume 40% -> 50%");
      });
    });

    describe("queueCommandClear", () => {
      it("should clear queue", async () => {
        const mockApi = {
          queueCommandClear: jest.fn(),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.queueCommandClear("queue-123");

        expect(mockApi.queueCommandClear).toHaveBeenCalledWith("queue-123");
      });

      it("should propagate API errors when clearing queue", async () => {
        const mockApi = {
          queueCommandClear: jest.fn().mockRejectedValue(new Error("clear failed")),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await expect(client.queueCommandClear("queue-123")).rejects.toThrow("clear failed");
      });
    });

    describe("queueCommandDelete", () => {
      it("should delete queue item by ID", async () => {
        const mockApi = {
          queueCommandDelete: jest.fn(),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.queueCommandDelete("queue-123", "item-456");

        expect(mockApi.queueCommandDelete).toHaveBeenCalledWith("queue-123", "item-456");
      });

      it("should delete queue item by index", async () => {
        const mockApi = {
          queueCommandDelete: jest.fn(),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.queueCommandDelete("queue-123", 5);

        expect(mockApi.queueCommandDelete).toHaveBeenCalledWith("queue-123", 5);
      });

      it("should propagate API errors when deleting queue item", async () => {
        const mockApi = {
          queueCommandDelete: jest.fn().mockRejectedValue(new Error("delete failed")),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await expect(client.queueCommandDelete("queue-123", "item-456")).rejects.toThrow("delete failed");
      });
    });

    describe("queueCommandMoveItem", () => {
      it("should move item up in queue", async () => {
        const mockApi = {
          queueCommandMoveItem: jest.fn(),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.queueCommandMoveItem("queue-123", "item-456", -1);

        expect(mockApi.queueCommandMoveItem).toHaveBeenCalledWith("queue-123", "item-456", -1);
      });

      it("should move item down in queue", async () => {
        const mockApi = {
          queueCommandMoveItem: jest.fn(),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.queueCommandMoveItem("queue-123", "item-456", 1);

        expect(mockApi.queueCommandMoveItem).toHaveBeenCalledWith("queue-123", "item-456", 1);
      });

      it("should move item to next position", async () => {
        const mockApi = {
          queueCommandMoveItem: jest.fn(),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.queueCommandMoveItem("queue-123", "item-456", 0);

        expect(mockApi.queueCommandMoveItem).toHaveBeenCalledWith("queue-123", "item-456", 0);
      });

      it("should propagate API errors when moving queue item", async () => {
        const mockApi = {
          queueCommandMoveItem: jest.fn().mockRejectedValue(new Error("move failed")),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await expect(client.queueCommandMoveItem("queue-123", "item-456", -1)).rejects.toThrow("move failed");
      });
    });

    describe("getPlayerQueue", () => {
      it("should fetch player queue details", async () => {
        const mockQueue = {
          queue_id: "queue-123",
          shuffle_enabled: true,
          repeat_mode: "all",
        };
        const mockApi = {
          getPlayerQueue: jest.fn().mockResolvedValue(mockQueue),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        const result = await client.getPlayerQueue("queue-123");

        expect(mockApi.getPlayerQueue).toHaveBeenCalledWith("queue-123");
        expect(result).toEqual(mockQueue);
      });
    });

    describe("queueCommandShuffle", () => {
      it("should enable shuffle", async () => {
        const mockApi = {
          queueCommandShuffle: jest.fn(),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.queueCommandShuffle("queue-123", true);

        expect(mockApi.queueCommandShuffle).toHaveBeenCalledWith("queue-123", true);
      });

      it("should disable shuffle", async () => {
        const mockApi = {
          queueCommandShuffle: jest.fn(),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.queueCommandShuffle("queue-123", false);

        expect(mockApi.queueCommandShuffle).toHaveBeenCalledWith("queue-123", false);
      });

      it("should propagate API errors when toggling shuffle", async () => {
        const mockApi = {
          queueCommandShuffle: jest.fn().mockRejectedValue(new Error("shuffle failed")),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await expect(client.queueCommandShuffle("queue-123", true)).rejects.toThrow("shuffle failed");
      });
    });

    describe("queueCommandRepeat", () => {
      it("should set repeat mode to ALL", async () => {
        const mockApi = {
          queueCommandRepeat: jest.fn(),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.queueCommandRepeat("queue-123", "all" as any);

        expect(mockApi.queueCommandRepeat).toHaveBeenCalledWith("queue-123", "all");
      });

      it("should set repeat mode to ONE", async () => {
        const mockApi = {
          queueCommandRepeat: jest.fn(),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.queueCommandRepeat("queue-123", "one" as any);

        expect(mockApi.queueCommandRepeat).toHaveBeenCalledWith("queue-123", "one");
      });

      it("should set repeat mode to OFF", async () => {
        const mockApi = {
          queueCommandRepeat: jest.fn(),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await client.queueCommandRepeat("queue-123", "off" as any);

        expect(mockApi.queueCommandRepeat).toHaveBeenCalledWith("queue-123", "off");
      });

      it("should propagate API errors when setting repeat mode", async () => {
        const mockApi = {
          queueCommandRepeat: jest.fn().mockRejectedValue(new Error("repeat failed")),
        };

        mockExecuteApiCommand.mockImplementation(async (command) => {
          return command(mockApi as any);
        });

        await expect(client.queueCommandRepeat("queue-123", "all" as any)).rejects.toThrow("repeat failed");
      });
    });
  });
});
