import { showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "../src/music-assistant-client";
import { getSelectedQueueID } from "../src/use-selected-player-id";
import volumeDownMain from "../src/volume-down";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("@raycast/utils");
jest.mock("../src/music-assistant-client");
jest.mock("../src/use-selected-player-id");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockShowFailureToast = showFailureToast as jest.MockedFunction<typeof showFailureToast>;
const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

describe("volume-down command", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    mockClientInstance = {
      volumeDown: jest.fn(),
      getPlayer: jest.fn(),
    } as any;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
    mockShowToast.mockResolvedValue();
  });

  it("should execute volume down command and show before/after feedback", async () => {
    const selectedPlayerID = "test-player-123";
    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValueOnce({ volume_level: 70 } as any);
    mockClientInstance.volumeDown.mockResolvedValue(undefined);
    mockClientInstance.getPlayer.mockResolvedValueOnce({ volume_level: 60 } as any);

    await volumeDownMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.getPlayer).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockClientInstance.volumeDown).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "success",
      title: "🔉 Volume 70% → 60%",
    });
    expect(mockShowFailureToast).not.toHaveBeenCalled();
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
    const error = new Error("Connection failed");

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockClientInstance.getPlayer.mockResolvedValue({ volume_level: 50 } as any);
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
