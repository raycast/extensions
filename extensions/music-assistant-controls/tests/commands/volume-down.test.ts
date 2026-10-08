import MusicAssistantClient from "../../src/music-assistant/music-assistant-client";
import { getSelectedQueueID } from "../../src/player-selection/use-selected-player-id";
import volumeDownMain from "../../src/volume-down";
import { VolumeController } from "../../src/music-assistant/volume-strategies";

// Mock dependencies
jest.mock("../../src/music-assistant/music-assistant-client");
jest.mock("../../src/player-selection/use-selected-player-id");

const MockMusicAssistantClient = MusicAssistantClient as jest.MockedClass<typeof MusicAssistantClient>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

describe("volume-down command", () => {
  let mockClientInstance: jest.Mocked<MusicAssistantClient>;
  let mockVolumeController: jest.Mocked<VolumeController>;

  beforeEach(() => {
    mockVolumeController = {
      volumeDown: jest.fn(),
    } as any;

    mockClientInstance = {
      createVolumeController: jest.fn().mockResolvedValue(mockVolumeController),
    } as any;

    MockMusicAssistantClient.mockImplementation(() => mockClientInstance);
  });

  it("should create a volume controller and call volumeDown", async () => {
    const selectedPlayerID = "test-player-123";

    mockGetSelectedQueueID.mockResolvedValue(selectedPlayerID);
    mockVolumeController.volumeDown.mockResolvedValue(undefined);

    await volumeDownMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).toHaveBeenCalledTimes(1);
    expect(mockClientInstance.createVolumeController).toHaveBeenCalledWith(selectedPlayerID);
    expect(mockVolumeController.volumeDown).toHaveBeenCalledTimes(1);
  });

  it("should return early when no player is selected", async () => {
    mockGetSelectedQueueID.mockResolvedValue(undefined as any);

    await volumeDownMain();

    expect(mockGetSelectedQueueID).toHaveBeenCalledTimes(1);
    expect(MockMusicAssistantClient).not.toHaveBeenCalled();
    expect(mockClientInstance.createVolumeController).not.toHaveBeenCalled();
  });
});
