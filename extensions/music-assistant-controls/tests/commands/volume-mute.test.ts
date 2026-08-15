import MusicAssistantClient from "../../src/music-assistant/music-assistant-client";
import { getSelectedQueueID } from "../../src/player-selection/use-selected-player-id";
import volumeMuteMain from "../../src/volume-mute";
import { VolumeController } from "../../src/music-assistant/volume-strategies";

// Mock dependencies
jest.mock("../../src/music-assistant/music-assistant-client");
jest.mock("../../src/player-selection/use-selected-player-id");

const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

describe("volume-mute command", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;
  let mockVolumeController: jest.Mocked<VolumeController>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockVolumeController = {
      toggleMute: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockClientInstance = {
      createVolumeController: jest.fn().mockResolvedValue(mockVolumeController),
    } as any;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
  });

  it("should create volume controller and call toggleMute", async () => {
    const selectedPlayerID = "test-player-123";
    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);

    await volumeMuteMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.createVolumeController).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockVolumeController.toggleMute).toHaveBeenCalledTimes(1);
  });

  it("should return early when no player is selected", async () => {
    mockGetSelectedQueueID.mockResolvedValue(null);

    await volumeMuteMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).not.toHaveBeenCalled();
    expect(mockVolumeController.toggleMute).not.toHaveBeenCalled();
  });
});
