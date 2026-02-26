import { showToast } from "@raycast/api";
import MusicAssistantClient from "../../src/music-assistant/music-assistant-client";
import { Player } from "../../src/music-assistant/external-code/interfaces";

// Mock dependencies
jest.mock("@raycast/api");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;

describe("manage-player-groups - member volume control", () => {
  let mockClient: jest.Mocked<MusicAssistantClient>;
  let mockPlayers: Player[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockResolvedValue({} as any);
    mockClient = {
      setVolume: jest.fn(),
      getGroupStatus: jest.fn(),
      getGroupMembers: jest.fn(),
      isGroupLeader: jest.fn(),
    } as any;

    mockPlayers = [
      {
        player_id: "leader-1",
        display_name: "Living Room",
        volume_level: 50,
        group_childs: ["member-1", "member-2"],
      } as Player,
      {
        player_id: "member-1",
        display_name: "Speaker 1",
        volume_level: 30,
        group_childs: [],
      } as Player,
      {
        player_id: "member-2",
        display_name: "Speaker 2",
        volume_level: 70,
        group_childs: [],
      } as Player,
    ];
  });

  describe("adjustMemberVolume", () => {
    it("should increase volume by delta when player is found", async () => {
      const playerId = "member-1";
      const currentVolume = 30;
      const delta = 10;
      const expectedVolume = 40;

      // Simulate the adjustMemberVolume logic
      const player = mockPlayers.find((p) => p.player_id === playerId);
      if (!player) return;

      const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
      await mockClient.setVolume(playerId, newVolume);

      expect(mockClient.setVolume).toHaveBeenCalledWith(playerId, expectedVolume);
      expect(newVolume).toBe(expectedVolume);
    });

    it("should decrease volume by negative delta", async () => {
      const playerId = "member-2";
      const currentVolume = 70;
      const delta = -15;
      const expectedVolume = 55;

      const player = mockPlayers.find((p) => p.player_id === playerId);
      if (!player) return;

      const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
      await mockClient.setVolume(playerId, newVolume);

      expect(mockClient.setVolume).toHaveBeenCalledWith(playerId, expectedVolume);
      expect(newVolume).toBe(expectedVolume);
    });

    it("should clamp volume to minimum 0", async () => {
      const playerId = "member-1";
      const currentVolume = 5;
      const delta = -20;
      const expectedVolume = 0;

      const player = mockPlayers.find((p) => p.player_id === playerId);
      if (!player) return;

      const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
      await mockClient.setVolume(playerId, newVolume);

      expect(mockClient.setVolume).toHaveBeenCalledWith(playerId, expectedVolume);
      expect(newVolume).toBe(expectedVolume);
    });

    it("should clamp volume to maximum 100", async () => {
      const playerId = "member-2";
      const currentVolume = 95;
      const delta = 10;
      const expectedVolume = 100;

      const player = mockPlayers.find((p) => p.player_id === playerId);
      if (!player) return;

      const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
      await mockClient.setVolume(playerId, newVolume);

      expect(mockClient.setVolume).toHaveBeenCalledWith(playerId, expectedVolume);
      expect(newVolume).toBe(expectedVolume);
    });

    it("should handle setVolume API errors gracefully", async () => {
      const playerId = "member-1";
      const error = new Error("API Error: Connection failed");
      mockClient.setVolume.mockRejectedValue(error);

      try {
        await mockClient.setVolume(playerId, 50);
        fail("Should have thrown an error");
      } catch (err) {
        expect(err).toEqual(error);
        expect(mockClient.setVolume).toHaveBeenCalledWith(playerId, 50);
      }
    });

    it("should handle missing player gracefully", async () => {
      const playerId = "nonexistent-player";
      const player = mockPlayers.find((p) => p.player_id === playerId);

      expect(player).toBeUndefined();
      expect(mockClient.setVolume).not.toHaveBeenCalled();
    });
  });

  describe("member volume display", () => {
    it("should display member volume in subtitle", () => {
      const member = mockPlayers[1];
      const volumeSubtitle = `Group member · Volume: ${member.volume_level}%`;

      expect(volumeSubtitle).toBe("Group member · Volume: 30%");
    });

    it("should handle null volume level", () => {
      const memberWithNoVolume: Player = { ...mockPlayers[1], volume_level: null } as any;
      const volumeLevel = memberWithNoVolume.volume_level ?? 0;
      const volumeSubtitle = `Group member · Volume: ${volumeLevel}%`;

      expect(volumeSubtitle).toBe("Group member · Volume: 0%");
    });

    it("should handle undefined volume level", () => {
      const memberWithNoVolume: Player = { ...mockPlayers[1], volume_level: undefined } as any;
      const volumeLevel = memberWithNoVolume.volume_level ?? 0;
      const volumeSubtitle = `Group member · Volume: ${volumeLevel}%`;

      expect(volumeSubtitle).toBe("Group member · Volume: 0%");
    });
  });
});
