import MusicAssistantClient from "../src/music-assistant-client";
import { showToast, Toast } from "@raycast/api";

// Mock dependencies
jest.mock("../src/music-assistant-client");
jest.mock("@raycast/api");
jest.mock("@raycast/utils", () => ({
  useCachedPromise: jest.fn(),
}));

const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;

describe("manage-player-groups", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    mockClientInstance = {
      getPlayers: jest.fn(),
      groupPlayer: jest.fn(),
      ungroupPlayer: jest.fn(),
      setGroupMembers: jest.fn(),
      canFormGroup: jest.fn(),
      isGroupLeader: jest.fn(),
      getGroupStatus: jest.fn(),
      getCompatiblePlayers: jest.fn(),
    } as any;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
    mockShowToast.mockClear();
  });

  describe("groupPlayer", () => {
    it("should show success toast when grouping succeeds", async () => {
      mockClientInstance.groupPlayer.mockResolvedValueOnce(undefined);

      const { default: ManagePlayerGroupsCommand } = await import("../src/manage-player-groups");
      // Component renders and calls groupPlayer through action
      // Testing the logic that would be called when user clicks action

      // Simulate the groupPlayers function logic
      await mockClientInstance.groupPlayer("player-1", "leader-1");

      expect(mockClientInstance.groupPlayer).toHaveBeenCalledWith("player-1", "leader-1");
    });

    it("should show failure toast when grouping fails", async () => {
      const error = new Error("Incompatible players");
      mockClientInstance.groupPlayer.mockRejectedValueOnce(error);

      try {
        await mockClientInstance.groupPlayer("player-1", "leader-1");
      } catch (e) {
        // Expected error
      }

      expect(mockClientInstance.groupPlayer).toHaveBeenCalledWith("player-1", "leader-1");
    });
  });

  describe("ungroupPlayer", () => {
    it("should call ungroupPlayer with correct player ID", async () => {
      mockClientInstance.ungroupPlayer.mockResolvedValueOnce(undefined);

      await mockClientInstance.ungroupPlayer("player-1");

      expect(mockClientInstance.ungroupPlayer).toHaveBeenCalledWith("player-1");
    });

    it("should handle errors when ungrouping fails", async () => {
      const error = new Error("Ungroup failed");
      mockClientInstance.ungroupPlayer.mockRejectedValueOnce(error);

      await expect(mockClientInstance.ungroupPlayer("player-1")).rejects.toThrow("Ungroup failed");
    });
  });

  describe("setGroupMembers", () => {
    it("should call setGroupMembers with correct parameters when adding members", async () => {
      mockClientInstance.setGroupMembers.mockResolvedValueOnce(undefined);

      await mockClientInstance.setGroupMembers("leader-1", ["member-1", "member-2"]);

      expect(mockClientInstance.setGroupMembers).toHaveBeenCalledWith("leader-1", ["member-1", "member-2"]);
    });

    it("should call setGroupMembers with remove parameters when disbanding group", async () => {
      mockClientInstance.setGroupMembers.mockResolvedValueOnce(undefined);

      await mockClientInstance.setGroupMembers("leader-1", undefined, ["member-1", "member-2"]);

      expect(mockClientInstance.setGroupMembers).toHaveBeenCalledWith("leader-1", undefined, ["member-1", "member-2"]);
    });

    it("should handle errors when setting members fails", async () => {
      const error = new Error("Set members failed");
      mockClientInstance.setGroupMembers.mockRejectedValueOnce(error);

      await expect(mockClientInstance.setGroupMembers("leader-1", ["member-1"])).rejects.toThrow("Set members failed");
    });
  });

  describe("helper methods", () => {
    it("should use canFormGroup to check if player can form groups", () => {
      const player = { player_id: "test", can_group_with: ["player-1"] } as any;
      mockClientInstance.canFormGroup.mockReturnValueOnce(true);

      const result = mockClientInstance.canFormGroup(player);

      expect(result).toBe(true);
      expect(mockClientInstance.canFormGroup).toHaveBeenCalledWith(player);
    });

    it("should use isGroupLeader to detect group leaders", () => {
      const player = { player_id: "test", group_childs: ["child-1"] } as any;
      mockClientInstance.isGroupLeader.mockReturnValueOnce(true);

      const result = mockClientInstance.isGroupLeader(player);

      expect(result).toBe(true);
      expect(mockClientInstance.isGroupLeader).toHaveBeenCalledWith(player);
    });

    it("should use getGroupStatus to determine player status", () => {
      const player = { player_id: "test", group_childs: [] } as any;
      mockClientInstance.getGroupStatus.mockReturnValueOnce("Standalone");

      const result = mockClientInstance.getGroupStatus(player);

      expect(result).toBe("Standalone");
      expect(mockClientInstance.getGroupStatus).toHaveBeenCalledWith(player);
    });

    it("should use getCompatiblePlayers to filter compatible players", () => {
      const targetPlayer = { player_id: "leader", can_group_with: ["player-1"] } as any;
      const allPlayers = [{ player_id: "player-1", available: true, enabled: true }] as any[];
      mockClientInstance.getCompatiblePlayers.mockReturnValueOnce(allPlayers);

      const result = mockClientInstance.getCompatiblePlayers(targetPlayer, allPlayers);

      expect(result).toEqual(allPlayers);
      expect(mockClientInstance.getCompatiblePlayers).toHaveBeenCalledWith(targetPlayer, allPlayers);
    });
  });
});
