import { getPreferenceValues } from "@raycast/api";
import executeApiCommand from "../../src/music-assistant/api-command";
import { MusicAssistantApi } from "../../src/music-assistant/external-code/music-assistant-api";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("../../src/music-assistant/external-code/music-assistant-api");

const mockGetPreferenceValues = getPreferenceValues as jest.MockedFunction<typeof getPreferenceValues>;
const MockMusicAssistantApi = MusicAssistantApi as jest.MockedClass<typeof MusicAssistantApi>;

describe("executeApiCommand", () => {
  let mockApi: jest.Mocked<MusicAssistantApi>;

  beforeEach(() => {
    mockGetPreferenceValues.mockReturnValue({ host: "http://localhost:8095", token: "token-123" });

    mockApi = {
      initialize: jest.fn(),
      close: jest.fn(),
    } as any;

    MockMusicAssistantApi.mockImplementation(() => mockApi);
  });

  it("should execute command successfully", async () => {
    const mockCommand = jest.fn().mockResolvedValue("test-result");

    const result = await executeApiCommand(mockCommand);

    expect(mockApi.initialize).toHaveBeenCalledWith("http://localhost:8095", "token-123");
    expect(mockCommand).toHaveBeenCalledWith(mockApi);
    expect(mockApi.close).toHaveBeenCalled();
    expect(result).toBe("test-result");
  });

  it("should reject when command throws error", async () => {
    const commandError = new Error("Command failed");
    const mockCommand = jest.fn().mockRejectedValue(commandError);

    await expect(executeApiCommand(mockCommand)).rejects.toThrow("Command failed");

    expect(mockApi.initialize).toHaveBeenCalledWith("http://localhost:8095", "token-123");
    expect(mockCommand).toHaveBeenCalledWith(mockApi);
    expect(mockApi.close).toHaveBeenCalled();
  });

  it("should reject when initialize throws error", async () => {
    const initError = new Error("Failed to connect");
    mockApi.initialize.mockImplementation(() => {
      throw initError;
    });
    const mockCommand = jest.fn();

    await expect(executeApiCommand(mockCommand)).rejects.toThrow("Failed to connect");

    expect(mockApi.initialize).toHaveBeenCalledWith("http://localhost:8095", "token-123");
    expect(mockCommand).not.toHaveBeenCalled();
    expect(mockApi.close).toHaveBeenCalled();
  });

  it("should always call close even when command succeeds", async () => {
    const mockCommand = jest.fn().mockResolvedValue("success");

    await executeApiCommand(mockCommand);

    expect(mockApi.close).toHaveBeenCalled();
  });
});
