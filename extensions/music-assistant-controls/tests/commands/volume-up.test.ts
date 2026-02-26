import { showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "../../src/music-assistant/music-assistant-client";
import { getSelectedQueueID } from "../../src/player-selection/use-selected-player-id";
import volumeUpMain from "../../src/volume-up";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("@raycast/utils");
jest.mock("../../src/music-assistant/music-assistant-client");
jest.mock("../../src/player-selection/use-selected-player-id");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockShowFailureToast = showFailureToast as jest.MockedFunction<typeof showFailureToast>;
const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

describe("volume-up command", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    mockClientInstance = {
      volumeUp: jest.fn(),
      groupVolumeUp: jest.fn(),
      getPlayer: jest.fn(),
      getVolumeControlPlayer: jest.fn(),
      shouldUseGroupVolume: jest.fn(),
      formatVolumeTransition: jest.fn(),
    } as any;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
    mockShowToast.mockResolvedValue({} as any);
  });

  it("should execute volume up command and show before/after feedback", async () => {
    const selectedPlayerID = "test-player-123";
    const playerData = { player_id: selectedPlayerID, volume_level: 60, synced_to: null, group_childs: [] } as any;
    const playerDataAfter = { ...playerData, volume_level: 70 } as any;

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValueOnce(playerData);
    mockClientInstance.shouldUseGroupVolume.mockReturnValue(false);
    mockClientInstance.getVolumeControlPlayer.mockReturnValue(selectedPlayerID);
    mockClientInstance.volumeUp.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValueOnce(playerDataAfter);
    mockClientInstance.formatVolumeTransition.mockReturnValue("Volume 60% -> 70%");

    await volumeUpMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.getPlayer).toHaveBeenCalledTimes(2);
    expect(mockClientInstance.shouldUseGroupVolume).toHaveBeenCalledWith(playerData);
    expect(mockClientInstance.volumeUp).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.formatVolumeTransition).toHaveBeenCalledWith(60, 70);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔊 Volume 60% -> 70%",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should control group volume when player is a group leader with members", async () => {
    const selectedPlayerID = "group-leader";
    const leaderData = {
      player_id: selectedPlayerID,
      volume_level: 50,
      group_childs: ["member-1"],
      group_volume: 50,
    } as any;
    const leaderDataAfter = { ...leaderData, group_volume: 60 } as any;

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValueOnce(leaderData);
    mockClientInstance.shouldUseGroupVolume.mockReturnValue(true);
    mockClientInstance.groupVolumeUp.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValueOnce(leaderDataAfter);
    mockClientInstance.formatVolumeTransition.mockReturnValue("Volume 50% -> 60%");

    await volumeUpMain();

    expect(mockClientInstance.shouldUseGroupVolume).toHaveBeenCalledWith(leaderData);
    expect(mockClientInstance.groupVolumeUp).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔊 Volume 50% -> 60%",
    });
  });

  it("should return early when no player is selected", async () => {
    mockGetSelectedQueueID.mockResolvedValue(undefined as any);

    await volumeUpMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).not.toHaveBeenCalled();
    expect(mockClientInstance.volumeUp).not.toHaveBeenCalled();
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should show failure toast when volume up command fails", async () => {
    const selectedPlayerID = "test-player-123";
    const playerData = { player_id: selectedPlayerID, volume_level: 50, synced_to: null, group_childs: [] } as any;
    const error = new Error("Connection failed");

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValue(playerData);
    mockClientInstance.shouldUseGroupVolume.mockReturnValue(false);
    mockClientInstance.getVolumeControlPlayer.mockReturnValue(selectedPlayerID);
    mockClientInstance.volumeUp.mockRejectedValue(error);

    await volumeUpMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.volumeUp).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
      title: "💥 Something went wrong!",
    });
  });
});
