import { showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "../../src/music-assistant/music-assistant-client";
import { getSelectedQueueID } from "../../src/player-selection/use-selected-player-id";
import volumeDownMain from "../../src/volume-down";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("@raycast/utils");
jest.mock("../../src/music-assistant/music-assistant-client");
jest.mock("../../src/player-selection/use-selected-player-id");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockShowFailureToast = showFailureToast as jest.MockedFunction<typeof showFailureToast>;
const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

describe("volume-down command", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    mockClientInstance = {
      volumeDown: jest.fn(),
      groupVolumeDown: jest.fn(),
      getPlayer: jest.fn(),
      getVolumeControlPlayer: jest.fn(),
      shouldUseGroupVolume: jest.fn(),
      formatVolumeTransition: jest.fn(),
    } as any;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
    mockShowToast.mockResolvedValue({} as any);
  });

  it("should execute volume down command and show before/after feedback", async () => {
    const selectedPlayerID = "test-player-123";
    const playerData = { player_id: selectedPlayerID, volume_level: 70, synced_to: null, group_childs: [] } as any;
    const playerDataAfter = { ...playerData, volume_level: 60 } as any;

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValueOnce(playerData);
    mockClientInstance.shouldUseGroupVolume.mockReturnValue(false);
    mockClientInstance.getVolumeControlPlayer.mockReturnValue(selectedPlayerID);
    mockClientInstance.volumeDown.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValueOnce(playerDataAfter);
    mockClientInstance.formatVolumeTransition.mockReturnValue("Volume 70% -> 60%");

    await volumeDownMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.getPlayer).toHaveBeenCalledTimes(2);
    expect(mockClientInstance.shouldUseGroupVolume).toHaveBeenCalledWith(playerData);
    expect(mockClientInstance.volumeDown).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.formatVolumeTransition).toHaveBeenCalledWith(70, 60);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔉 Volume 70% -> 60%",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should control group volume when player is part of a group", async () => {
    const selectedPlayerID = "member-player";
    const leaderPlayerID = "group-leader";
    const memberData = { player_id: selectedPlayerID, volume_level: 70, synced_to: leaderPlayerID } as any;
    const leaderData = { player_id: leaderPlayerID, volume_level: 60, group_childs: [selectedPlayerID] } as any;

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValueOnce(memberData);
    mockClientInstance.getVolumeControlPlayer.mockReturnValue(leaderPlayerID);
    mockClientInstance.getPlayer.mockResolvedValueOnce(leaderData);
    mockClientInstance.volumeDown.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValueOnce({ ...leaderData, volume_level: 50 } as any);
    mockClientInstance.formatVolumeTransition.mockReturnValue("Volume 60% -> 50%");

    await volumeDownMain();

    // Should control the group leader's volume, not the member
    expect(mockClientInstance.volumeDown).toHaveBeenCalledWith(leaderPlayerID);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔉 Volume 60% -> 50%",
    });
  });

  it("should return early when no player is selected", async () => {
    mockGetSelectedQueueID.mockResolvedValue(undefined as any);

    await volumeDownMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).not.toHaveBeenCalled();
    expect(mockClientInstance.volumeDown).not.toHaveBeenCalled();
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should show failure toast when volume down command fails", async () => {
    const selectedPlayerID = "test-player-123";
    const playerData = { player_id: selectedPlayerID, volume_level: 50, synced_to: null, group_childs: [] } as any;
    const error = new Error("Connection failed");

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValue(playerData);
    mockClientInstance.shouldUseGroupVolume.mockReturnValue(false);
    mockClientInstance.getVolumeControlPlayer.mockReturnValue(selectedPlayerID);
    mockClientInstance.volumeDown.mockRejectedValue(error);

    await volumeDownMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.volumeDown).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
      title: "💥 Something went wrong!",
    });
  });
});
