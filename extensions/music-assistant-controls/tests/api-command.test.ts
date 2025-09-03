import { getPreferenceValues } from "@raycast/api";
import executeApiCommand from "../src/api-command";
import { MusicAssistantApi } from "../src/external-code/music-assistant-api";
import { EventType } from "../src/external-code/interfaces";

// Mock dependencies
jest.mock("@raycast/api");
jest.mock("../src/external-code/music-assistant-api");
jest.mock("../src/polyfills");

const mockGetPreferenceValues = getPreferenceValues as jest.MockedFunction<typeof getPreferenceValues>;
const MockMusicAssistantApi = MusicAssistantApi as jest.MockedClass<typeof MusicAssistantApi>;

describe("executeApiCommand", () => {
  let mockApi: jest.Mocked<MusicAssistantApi>;

  beforeEach(() => {
    mockGetPreferenceValues.mockReturnValue({ host: "http://localhost:8095" });

    mockApi = {
      subscribe_multi: jest.fn(),
      initialize: jest.fn(),
      close: jest.fn(),
    } as any;

    MockMusicAssistantApi.mockImplementation(() => mockApi);
  });

  it("should execute command successfully when connected", async () => {
    const mockCommand = jest.fn().mockResolvedValue("test-result");

    mockApi.subscribe_multi.mockImplementation((events, callback) => {
      // Simulate successful connection
      setTimeout(() => callback({ event: EventType.CONNECTED }), 0);
      return () => {}; // Return unsubscribe function
    });

    const result = await executeApiCommand(mockCommand);

    expect(mockApi.initialize).toHaveBeenCalledWith("http://localhost:8095");
    expect(mockApi.subscribe_multi).toHaveBeenCalledWith([EventType.CONNECTED, EventType.Error], expect.any(Function));
    expect(mockCommand).toHaveBeenCalledWith(mockApi);
    expect(mockApi.close).toHaveBeenCalled();
    expect(result).toBe("test-result");
  });

  it("should reject when API returns error event", async () => {
    const mockCommand = jest.fn();
    const errorData = { message: "Connection failed" };

    mockApi.subscribe_multi.mockImplementation((events, callback) => {
      // Simulate error event
      setTimeout(() => callback({ event: EventType.Error, data: errorData }), 0);
      return () => {}; // Return unsubscribe function
    });

    await expect(executeApiCommand(mockCommand)).rejects.toBe(errorData);

    expect(mockApi.initialize).toHaveBeenCalledWith("http://localhost:8095");
    expect(mockCommand).not.toHaveBeenCalled();
    expect(mockApi.close).toHaveBeenCalled();
  });

  it("should reject when command throws error", async () => {
    const commandError = new Error("Command failed");
    const mockCommand = jest.fn().mockRejectedValue(commandError);

    mockApi.subscribe_multi.mockImplementation((events, callback) => {
      // Simulate successful connection
      setTimeout(() => callback({ event: EventType.CONNECTED }), 0);
      return () => {}; // Return unsubscribe function
    });

    await expect(executeApiCommand(mockCommand)).rejects.toBe(commandError);

    expect(mockCommand).toHaveBeenCalledWith(mockApi);
    expect(mockApi.close).toHaveBeenCalled();
  });

  it("should reject when initialization fails", async () => {
    const initError = new Error("Initialize failed");
    const mockCommand = jest.fn();

    mockApi.initialize.mockImplementation(() => {
      throw initError;
    });

    await expect(executeApiCommand(mockCommand)).rejects.toBe(initError);

    expect(mockApi.initialize).toHaveBeenCalledWith("http://localhost:8095");
    expect(mockCommand).not.toHaveBeenCalled();
  });
});
