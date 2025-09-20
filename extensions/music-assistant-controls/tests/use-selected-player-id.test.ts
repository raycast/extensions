import { showToast, launchCommand, LocalStorage, LaunchType } from "@raycast/api";
import {
  storeSelectedQueueID,
  getSelectedQueueID,
  selectedPlayerKey,
  type StoredQueue,
} from "../src/use-selected-player-id";

jest.mock("@raycast/api");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockLaunchCommand = launchCommand as jest.MockedFunction<typeof launchCommand>;
const mockLocalStorage = LocalStorage as jest.Mocked<typeof LocalStorage>;

describe("use-selected-player-id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("storeSelectedQueueID", () => {
    it("should store queue ID in LocalStorage", async () => {
      const queueId = "test-queue-123";
      mockLocalStorage.setItem.mockResolvedValue();

      await storeSelectedQueueID(queueId);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(selectedPlayerKey, JSON.stringify({ queue_id: queueId }));
    });

    it("should handle storage errors", async () => {
      const queueId = "test-queue-123";
      const error = new Error("Storage failed");
      mockLocalStorage.setItem.mockRejectedValue(error);

      await expect(storeSelectedQueueID(queueId)).rejects.toThrow("Storage failed");
    });
  });

  describe("getSelectedQueueID", () => {
    it("should return stored queue ID when available", async () => {
      const storedData: StoredQueue = { queue_id: "stored-queue-456" };
      mockLocalStorage.getItem.mockResolvedValue(JSON.stringify(storedData));

      const result = await getSelectedQueueID();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(selectedPlayerKey);
      expect(result).toBe("stored-queue-456");
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("should show toast and return undefined when no stored data", async () => {
      mockLocalStorage.getItem.mockResolvedValue(undefined);

      const result = await getSelectedQueueID();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(selectedPlayerKey);
      expect(result).toBeUndefined();
      expect(mockShowToast).toHaveBeenCalledWith({
        title: "😲 No player selected!",
        message: "Please select an active player first.",
        primaryAction: {
          title: "Set Active Player",
          onAction: expect.any(Function),
        },
      });
    });

    it("should show toast and return undefined when stored data is null", async () => {
      mockLocalStorage.getItem.mockResolvedValue("null");

      const result = await getSelectedQueueID();

      expect(result).toBeUndefined();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it("should show toast and return undefined when stored data is invalid JSON", async () => {
      mockLocalStorage.getItem.mockResolvedValue("invalid-json");

      const result = await getSelectedQueueID();

      expect(result).toBeUndefined();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it("should launch set-active-player command when toast action is clicked", async () => {
      mockLocalStorage.getItem.mockResolvedValue(undefined);

      await getSelectedQueueID();

      // Get the toast options from the call
      const toastOptions = mockShowToast.mock.calls[0][0];
      const onAction = (toastOptions as any).primaryAction?.onAction;

      expect(onAction).toBeDefined();

      if (onAction) {
        onAction();
        expect(mockLaunchCommand).toHaveBeenCalledWith({
          name: "set-active-player",
          type: LaunchType.UserInitiated,
        });
      }
    });

    it("should handle LocalStorage errors gracefully", async () => {
      const error = new Error("Storage access denied");
      mockLocalStorage.getItem.mockRejectedValue(error);

      const result = await getSelectedQueueID();

      expect(result).toBeUndefined();
      expect(mockShowToast).toHaveBeenCalled();
    });
  });
});
