import { showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "../src/music-assistant-client";
import { getSelectedQueueID } from "../src/use-selected-player-id";
import volumeMuteMain from "../src/volume-mute";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("@raycast/utils");
jest.mock("../src/music-assistant-client");
jest.mock("../src/use-selected-player-id");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockShowFailureToast = showFailureToast as jest.MockedFunction<typeof showFailureToast>;
const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

describe("volume-mute command", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    mockClientInstance = {
      volumeMute: jest.fn(),
      getPlayer: jest.fn(),
      supportsMuteControl: jest.fn(),
      setVolume: jest.fn(),
    } as any;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
    mockShowToast.mockResolvedValue();
  });

  it("should toggle from unmuted to muted and show feedback", async () => {
    const selectedPlayerID = "test-player-123";
    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValueOnce({ volume_muted: false, mute_control: "absolute" } as any);
    mockClientInstance.supportsMuteControl.mockReturnValue(true);
    mockClientInstance.volumeMute.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValueOnce({ volume_muted: true } as any);

    await volumeMuteMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.getPlayer).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.supportsMuteControl).toHaveBeenCalled();
    expect(mockClientInstance.volumeMute).toHaveBeenCalledWith(selectedPlayerID, true);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔇",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should toggle from muted to unmuted and show feedback", async () => {
    const selectedPlayerID = "test-player-123";
    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValueOnce({ volume_muted: true, mute_control: "absolute" } as any);
    mockClientInstance.supportsMuteControl.mockReturnValue(true);
    mockClientInstance.volumeMute.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValueOnce({ volume_muted: false } as any);

    await volumeMuteMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.getPlayer).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.supportsMuteControl).toHaveBeenCalled();
    expect(mockClientInstance.volumeMute).toHaveBeenCalledWith(selectedPlayerID, false);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔊",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should handle undefined volume_muted as false (unmuted)", async () => {
    const selectedPlayerID = "test-player-123";
    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValueOnce({ volume_muted: undefined, mute_control: "absolute" } as any);
    mockClientInstance.supportsMuteControl.mockReturnValue(true);
    mockClientInstance.volumeMute.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValueOnce({ volume_muted: true } as any);

    await volumeMuteMain();

    expect(mockClientInstance.volumeMute).toHaveBeenCalledWith(selectedPlayerID, true);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔇",
    });
  });

  it("should return early when no player is selected", async () => {
    mockGetSelectedQueueID.mockResolvedValue(undefined as any);

    await volumeMuteMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).not.toHaveBeenCalled();
    expect(mockClientInstance.volumeMute).not.toHaveBeenCalled();
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should use volume control fallback when player does not support mute (volume > 0)", async () => {
    const selectedPlayerID = "test-player-123";
    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValue({ volume_level: 75, mute_control: "none" } as any);
    mockClientInstance.supportsMuteControl.mockReturnValue(false);
    mockClientInstance.setVolume.mockResolvedValue(undefined);

    await volumeMuteMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.getPlayer).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.supportsMuteControl).toHaveBeenCalled();
    expect(mockClientInstance.volumeMute).not.toHaveBeenCalled();
    expect(mockClientInstance.setVolume).toHaveBeenCalledWith(selectedPlayerID, 0);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔇",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should use volume control fallback when player does not support mute (volume = 0)", async () => {
    const selectedPlayerID = "test-player-123";
    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValue({ volume_level: 0, mute_control: "none" } as any);
    mockClientInstance.supportsMuteControl.mockReturnValue(false);
    mockClientInstance.setVolume.mockResolvedValue(undefined);

    await volumeMuteMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.getPlayer).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.supportsMuteControl).toHaveBeenCalled();
    expect(mockClientInstance.volumeMute).not.toHaveBeenCalled();
    expect(mockClientInstance.setVolume).toHaveBeenCalledWith(selectedPlayerID, 10);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔊",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
  });

  it("should show failure toast when volume mute command fails", async () => {
    const selectedPlayerID = "test-player-123";
    const error = new Error("Connection failed");

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValue({ volume_muted: false, mute_control: "absolute" } as any);
    mockClientInstance.supportsMuteControl.mockReturnValue(true);
    mockClientInstance.volumeMute.mockRejectedValue(error);

    await volumeMuteMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.volumeMute).toHaveBeenCalledWith(selectedPlayerID, true);
    expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
      title: "💥 Something went wrong!",
    });
  });
});
