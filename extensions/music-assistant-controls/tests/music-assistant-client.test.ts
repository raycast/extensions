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

    describe("shouldUpdateTitle", () => {
      it("should return true when new title is different", () => {
        const result = client.shouldUpdateTitle("Old Song", "New Song");
        expect(result).toBe(true);
      });

      it("should return false when titles are the same", () => {
        const result = client.shouldUpdateTitle("Same Song", "Same Song");
        expect(result).toBe(false);
      });

      it("should return true when new title is undefined and current title exists", () => {
        const result = client.shouldUpdateTitle("Current Song", undefined);
        expect(result).toBe(true);
      });

      it("should return false when both titles are undefined", () => {
        const result = client.shouldUpdateTitle(undefined, undefined);
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
});
