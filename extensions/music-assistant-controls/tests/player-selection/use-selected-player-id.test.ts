import { showToast, launchCommand, LocalStorage, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  storeSelectedQueueID,
  getSelectedQueueID,
  getStoredQueue,
  selectedPlayerKey,
  type StoredQueue,
} from "../../src/player-selection/use-selected-player-id";

jest.mock("@raycast/api");
jest.mock("@raycast/utils");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockLaunchCommand = launchCommand as jest.MockedFunction<typeof launchCommand>;
const mockShowFailureToast = showFailureToast as jest.MockedFunction<typeof showFailureToast>;
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

    it("should show toast and return undefined when stored data is missing queue_id", async () => {
      mockLocalStorage.getItem.mockResolvedValue(JSON.stringify({}));

      const result = await getSelectedQueueID();

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

    it("should show toast and return undefined when stored data is invalid JSON", async () => {
      mockLocalStorage.getItem.mockResolvedValue("invalid-json");

      const result = await getSelectedQueueID();

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

    it("should launch set-active-player command when toast action is clicked", async () => {
      mockLocalStorage.getItem.mockResolvedValue(undefined);
      mockLaunchCommand.mockResolvedValue();

      await getSelectedQueueID();

      // Get the toast options from the call
      const toastOptions = mockShowToast.mock.calls[0][0];
      const onAction = (toastOptions as any).primaryAction?.onAction;

      expect(onAction).toBeDefined();

      if (onAction) {
        await onAction();
        expect(mockLaunchCommand).toHaveBeenCalledWith({
          name: "set-active-player",
          type: LaunchType.UserInitiated,
        });
        expect(mockShowFailureToast).not.toHaveBeenCalled();
      }
    });

    it("should handle launchCommand errors in toast action", async () => {
      mockLocalStorage.getItem.mockResolvedValue(undefined);
      const error = new Error("Command launch failed");
      mockLaunchCommand.mockRejectedValue(error);

      await getSelectedQueueID();

      const toastOptions = mockShowToast.mock.calls[0][0];
      const onAction = (toastOptions as any).primaryAction?.onAction;

      if (onAction) {
        await onAction();
        expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
          title: "Failed to launch set-active-player command",
        });
      }
    });

    it("should handle launchCommand errors in catch block toast action", async () => {
      const storageError = new Error("Storage access denied");
      mockLocalStorage.getItem.mockRejectedValue(storageError);
      const commandError = new Error("Command launch failed");
      mockLaunchCommand.mockRejectedValue(commandError);

      await getSelectedQueueID();

      const toastOptions = mockShowToast.mock.calls[0][0];
      const onAction = (toastOptions as any).primaryAction?.onAction;

      if (onAction) {
        await onAction();
        expect(mockShowFailureToast).toHaveBeenCalledWith(commandError, {
          title: "Failed to launch set-active-player command",
        });
      }
    });
  });

  describe("getStoredQueue", () => {
    it("should return parsed stored queue when valid", async () => {
      const storedData: StoredQueue = { queue_id: "stored-queue-789" };
      mockLocalStorage.getItem.mockResolvedValue(JSON.stringify(storedData));

      const result = await getStoredQueue();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(selectedPlayerKey);
      expect(result).toEqual(storedData);
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("should return undefined when no stored queue exists", async () => {
      mockLocalStorage.getItem.mockResolvedValue(undefined);

      const result = await getStoredQueue();

      expect(result).toBeUndefined();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("should return undefined when stored queue JSON is invalid", async () => {
      mockLocalStorage.getItem.mockResolvedValue("invalid-json");

      const result = await getStoredQueue();

      expect(result).toBeUndefined();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("should return undefined when stored queue has no queue_id", async () => {
      mockLocalStorage.getItem.mockResolvedValue(JSON.stringify({}));

      const result = await getStoredQueue();

      expect(result).toBeUndefined();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });
});
