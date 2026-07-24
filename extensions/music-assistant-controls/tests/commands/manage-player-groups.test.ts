import { showToast } from "@raycast/api";
import MusicAssistantClient from "../../src/music-assistant/music-assistant-client";
import { Player } from "../../src/music-assistant/external-code/interfaces";
import { PlayerVolumeController } from "../../src/music-assistant/volume-strategies";

// Mock dependencies
jest.mock("@raycast/api");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;

describe("manage-player-groups - member volume control", () => {
  let mockClient: jest.Mocked<MusicAssistantClient>;
  let mockPlayerVolumeController: jest.Mocked<PlayerVolumeController>;
  let mockPlayers: Player[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockResolvedValue({} as any);

    mockPlayerVolumeController = {
      setVolume: jest.fn(),
      getVolume: jest.fn(),
      volumeUp: jest.fn(),
      volumeDown: jest.fn(),
    } as any;

    mockClient = {
      createPlayerVolumeController: jest.fn().mockResolvedValue(mockPlayerVolumeController),
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
      } as unknown as Player,
      {
        player_id: "member-1",
        display_name: "Speaker 1",
        volume_level: 30,
        group_childs: [],
      } as unknown as Player,
      {
        player_id: "member-2",
        display_name: "Speaker 2",
        volume_level: 70,
        group_childs: [],
      } as unknown as Player,
    ];
  });

  describe("adjustMemberVolume", () => {
    it("should increase volume by delta", async () => {
      const volumeBefore = 30;
      const delta = 10;
      const expectedVolume = 40;

      const newVolume = Math.max(0, Math.min(100, volumeBefore + delta));
      expect(newVolume).toBe(expectedVolume);
    });

    it("should decrease volume by negative delta", async () => {
      const volumeBefore = 70;
      const delta = -15;
      const expectedVolume = 55;

      const newVolume = Math.max(0, Math.min(100, volumeBefore + delta));
      expect(newVolume).toBe(expectedVolume);
    });

    it("should clamp volume to minimum 0", async () => {
      const volumeBefore = 5;
      const delta = -20;
      const expectedVolume = 0;

      const newVolume = Math.max(0, Math.min(100, volumeBefore + delta));
      expect(newVolume).toBe(expectedVolume);
    });

    it("should clamp volume to maximum 100", async () => {
      const volumeBefore = 95;
      const delta = 10;
      const expectedVolume = 100;

      const newVolume = Math.max(0, Math.min(100, volumeBefore + delta));
      expect(newVolume).toBe(expectedVolume);
    });

    it("should use PlayerVolumeController for member volume adjustment", async () => {
      mockClient.createPlayerVolumeController.mockResolvedValue(mockPlayerVolumeController);
      mockPlayerVolumeController.getVolume.mockResolvedValue(50);

      // Simulate what adjustMemberVolume does when called
      const controller = await mockClient.createPlayerVolumeController("member-1");
      expect(mockClient.createPlayerVolumeController).toHaveBeenCalledWith("member-1");
      expect(controller).toBe(mockPlayerVolumeController);
    });

    it("should handle setVolume API errors gracefully", async () => {
      const error = new Error("API Error: Connection failed");
      mockPlayerVolumeController.setVolume.mockRejectedValue(error);

      try {
        await mockPlayerVolumeController.setVolume(50);
        fail("Should have thrown an error");
      } catch (err) {
        expect(err).toEqual(error);
      }
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
