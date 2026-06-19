import { showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "../../src/music-assistant/music-assistant-client";
import { GroupVolumeController, PlayerVolumeController } from "../../src/music-assistant/volume-strategies";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("@raycast/utils");
jest.mock("../../src/music-assistant/music-assistant-client");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockShowFailureToast = showFailureToast as jest.MockedFunction<typeof showFailureToast>;

describe("GroupVolumeController", () => {
  let mockClient: jest.Mocked<MusicAssistantClient>;
  let controller: GroupVolumeController;

  beforeEach(() => {
    mockClient = {
      groupVolumeUp: jest.fn(),
      groupVolumeDown: jest.fn(),
      groupSetVolume: jest.fn(),
      getPlayer: jest.fn(),
    } as any;

    mockShowToast.mockResolvedValue({} as any);
    controller = new GroupVolumeController("group-1", mockClient);
  });

  it("should increase group volume and show success toast", async () => {
    const playerAfter = { player_id: "group-1", group_volume: 60, group_childs: ["m1"] } as any;

    mockClient.groupVolumeUp.mockResolvedValue(undefined);
    mockClient.getPlayer.mockResolvedValue(playerAfter);

    await controller.volumeUp();

    expect(mockClient.groupVolumeUp).toHaveBeenCalledWith("group-1");
    expect(mockClient.getPlayer).toHaveBeenCalledWith("group-1");
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔊 Volume: 60%",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should decrease group volume and show success toast", async () => {
    const playerAfter = { player_id: "group-1", group_volume: 40, group_childs: ["m1"] } as any;

    mockClient.groupVolumeDown.mockResolvedValue(undefined);
    mockClient.getPlayer.mockResolvedValue(playerAfter);

    await controller.volumeDown();

    expect(mockClient.groupVolumeDown).toHaveBeenCalledWith("group-1");
    expect(mockClient.getPlayer).toHaveBeenCalledWith("group-1");
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔉 Volume: 40%",
    });
  });

  it("should set group volume and show success toast", async () => {
    const playerAfter = { player_id: "group-1", group_volume: 75, group_childs: ["m1"] } as any;

    mockClient.groupSetVolume.mockResolvedValue(undefined);
    mockClient.getPlayer.mockResolvedValue(playerAfter);
    mockClient.getPlayer.mockResolvedValue(playerAfter);

    await controller.setVolume(75);

    expect(mockClient.groupSetVolume).toHaveBeenCalledWith("group-1", 75);
    expect(mockClient.getPlayer).toHaveBeenCalledWith("group-1");
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔊 Volume: 75%",
    });
  });

  it("should handle volumeUp error and show failure toast", async () => {
    const error = new Error("API error");

    mockClient.groupVolumeUp.mockRejectedValue(error);

    await controller.volumeUp();

    expect(mockClient.groupVolumeUp).toHaveBeenCalledWith("group-1");
    expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
      title: "💥 Something went wrong!",
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("should handle getPlayer error and show failure toast", async () => {
    const error = new Error("Failed to get player");

    mockClient.groupVolumeUp.mockResolvedValue(undefined);
    mockClient.getPlayer.mockRejectedValue(error);

    await controller.volumeUp();

    expect(mockClient.groupVolumeUp).toHaveBeenCalledWith("group-1");
    expect(mockClient.getPlayer).toHaveBeenCalledWith("group-1");
    expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
      title: "💥 Something went wrong!",
    });
  });

  it("should extract group_volume from player", async () => {
    const playerAfter = { player_id: "group-1", group_volume: 60, volume_level: 55, group_childs: [] } as any;

    mockClient.groupVolumeUp.mockResolvedValue(undefined);
    mockClient.getPlayer.mockResolvedValue(playerAfter);

    await controller.volumeUp();

    // Should use group_volume (60), not volume_level (55)
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔊 Volume: 60%",
    });
  });

  it("should get current volume from player", async () => {
    const player = { player_id: "group-1", group_volume: 65, volume_level: 55 } as any;
    mockClient.getPlayer.mockResolvedValue(player);

    const volume = await controller.getVolume();

    expect(volume).toBe(65);
    expect(mockClient.getPlayer).toHaveBeenCalledWith("group-1");
  });
});

describe("PlayerVolumeController", () => {
  let mockClient: jest.Mocked<MusicAssistantClient>;
  let controller: PlayerVolumeController;

  beforeEach(() => {
    mockClient = {
      volumeUp: jest.fn(),
      volumeDown: jest.fn(),
      setVolume: jest.fn(),
      getPlayer: jest.fn(),
    } as any;

    mockShowToast.mockResolvedValue({} as any);
    controller = new PlayerVolumeController("player-1", mockClient);
  });

  it("should increase player volume and show success toast", async () => {
    const playerAfter = { player_id: "player-1", volume_level: 60 } as any;

    mockClient.volumeUp.mockResolvedValue(undefined);
    mockClient.getPlayer.mockResolvedValue(playerAfter);

    await controller.volumeUp();

    expect(mockClient.volumeUp).toHaveBeenCalledWith("player-1");
    expect(mockClient.getPlayer).toHaveBeenCalledWith("player-1");
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔊 Volume: 60%",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should decrease player volume and show success toast", async () => {
    const playerAfter = { player_id: "player-1", volume_level: 40 } as any;

    mockClient.volumeDown.mockResolvedValue(undefined);
    mockClient.getPlayer.mockResolvedValue(playerAfter);

    await controller.volumeDown();

    expect(mockClient.volumeDown).toHaveBeenCalledWith("player-1");
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔉 Volume: 40%",
    });
  });

  it("should set player volume and show success toast", async () => {
    const playerAfter = { player_id: "player-1", volume_level: 75 } as any;

    mockClient.setVolume.mockResolvedValue(undefined);
    mockClient.getPlayer.mockResolvedValue(playerAfter);

    await controller.setVolume(75);

    expect(mockClient.setVolume).toHaveBeenCalledWith("player-1", 75);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔊 Volume: 75%",
    });
  });

  it("should handle volumeDown error and show failure toast", async () => {
    const error = new Error("API error");

    mockClient.volumeDown.mockRejectedValue(error);

    await controller.volumeDown();

    expect(mockClient.volumeDown).toHaveBeenCalledWith("player-1");
    expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
      title: "💥 Something went wrong!",
    });
  });

  it("should extract volume_level from player", async () => {
    const playerAfter = { player_id: "player-1", volume_level: 60, group_volume: 65 } as any;

    mockClient.volumeUp.mockResolvedValue(undefined);
    mockClient.getPlayer.mockResolvedValue(playerAfter);

    await controller.volumeUp();

    // Should use volume_level (60), not group_volume (65)
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔊 Volume: 60%",
    });
  });

  it("should get current volume from player", async () => {
    const player = { player_id: "player-1", volume_level: 60, group_volume: 65 } as any;
    mockClient.getPlayer.mockResolvedValue(player);

    const volume = await controller.getVolume();

    expect(volume).toBe(60);
    expect(mockClient.getPlayer).toHaveBeenCalledWith("player-1");
  });

  describe("toggleMute", () => {
    beforeEach(() => {
      mockClient.supportsMuteControl = jest.fn();
      mockClient.volumeMute = jest.fn();
    });

    it("should use native mute control when supported (unmute to mute)", async () => {
      const playerBefore = {
        player_id: "player-1",
        volume_muted: false,
        mute_control: "absolute",
        volume_level: 50,
      } as any;
      const playerAfter = { player_id: "player-1", volume_muted: true, volume_level: 50 } as any;

      mockClient.getPlayer.mockResolvedValueOnce(playerBefore).mockResolvedValueOnce(playerAfter);
      mockClient.supportsMuteControl.mockReturnValue(true);
      mockClient.volumeMute.mockResolvedValue(undefined);

      await controller.toggleMute();

      expect(mockClient.supportsMuteControl).toHaveBeenCalledWith(playerBefore);
      expect(mockClient.volumeMute).toHaveBeenCalledWith("player-1", true);
      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "🔇",
      });
    });

    it("should use native mute control when supported (mute to unmute)", async () => {
      const playerBefore = {
        player_id: "player-1",
        volume_muted: true,
        mute_control: "absolute",
        volume_level: 50,
      } as any;
      const playerAfter = { player_id: "player-1", volume_muted: false, volume_level: 50 } as any;

      mockClient.getPlayer.mockResolvedValueOnce(playerBefore).mockResolvedValueOnce(playerAfter);
      mockClient.supportsMuteControl.mockReturnValue(true);
      mockClient.volumeMute.mockResolvedValue(undefined);

      await controller.toggleMute();

      expect(mockClient.volumeMute).toHaveBeenCalledWith("player-1", false);
      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "🔊",
      });
    });

    it("should use volume fallback when mute not supported (volume > 0)", async () => {
      const player = { player_id: "player-1", volume_level: 75, mute_control: "none" } as any;

      mockClient.getPlayer.mockResolvedValue(player);
      mockClient.supportsMuteControl.mockReturnValue(false);
      mockClient.setVolume.mockResolvedValue(undefined);

      await controller.toggleMute();

      expect(mockClient.supportsMuteControl).toHaveBeenCalledWith(player);
      expect(mockClient.setVolume).toHaveBeenCalledWith("player-1", 0);
      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "🔇",
      });
      expect(mockClient.volumeMute).not.toHaveBeenCalled();
    });

    it("should use volume fallback when mute not supported (volume = 0)", async () => {
      const player = { player_id: "player-1", volume_level: 0, mute_control: "none" } as any;

      mockClient.getPlayer.mockResolvedValue(player);
      mockClient.supportsMuteControl.mockReturnValue(false);
      mockClient.setVolume.mockResolvedValue(undefined);

      await controller.toggleMute();

      expect(mockClient.setVolume).toHaveBeenCalledWith("player-1", 10);
      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "🔊",
      });
    });

    it("should handle errors gracefully", async () => {
      const error = new Error("Mute failed");
      const player = { player_id: "player-1", volume_muted: false, mute_control: "absolute" } as any;

      mockClient.getPlayer.mockResolvedValue(player);
      mockClient.supportsMuteControl.mockReturnValue(true);
      mockClient.volumeMute.mockRejectedValue(error);

      await controller.toggleMute();

      expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
        title: "💥 Something went wrong!",
      });
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });
});
