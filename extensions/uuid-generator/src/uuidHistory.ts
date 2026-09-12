import { LocalStorage, showToast, Toast } from "@raycast/api";

export interface HistoryEntry {
  uuid: string;
  timestamp: Date;
  type: string;
}

export enum UUIDType {
  UUIDV4 = "uuidV4",
  UUIDV5 = "uuidV5",
  UUIDV7 = "uuidV7",
  ULID = "ulid",
  TYPEID = "typeid",
}

export const addToHistory = async (uuid: string, type: UUIDType) => {
  try {
    let currentHistory = await LocalStorage.getItem("uuidHistory");

    if (!currentHistory) {
      currentHistory = "[]";
    }

    if (typeof currentHistory !== "string") {
      return;
    }

    const parsedHistory = JSON.parse(currentHistory);

    parsedHistory.push({ uuid, timestamp: new Date(), type });

    await LocalStorage.setItem("uuidHistory", JSON.stringify(parsedHistory));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error saving history",
      message: "Failed to save history to local storage",
    });
  }
};

export const getHistory = async (): Promise<HistoryEntry[]> => {
  try {
    const result = await LocalStorage.getItem("uuidHistory");

    if (!result) {
      return [];
    }

    if (typeof result !== "string") {
      throw new Error("Invalid data type: Expected a string");
    }

    if (result) {
      const history = JSON.parse(result);
      return history;
    } else {
      return [];
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error fetching history",
      message: "Failed to retrieve history from local storage",
    });
    return [];
  }
};

export const clearHistory = () => {
  LocalStorage.removeItem("uuidHistory")
    .then(() => {
      showToast({
        style: Toast.Style.Success,
        title: "History Cleared",
        message: "UUID history has been successfully cleared.",
      });
    })
    .catch((error) => {
      console.error("Failed to clear history from local storage:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error clearing history",
        message: "Failed to clear history from local storage",
      });
    });
};

export const deleteHistoryEntry = async (uuidToDelete: string) => {
  try {
    const result = await LocalStorage.getItem("uuidHistory");

    if (!result) {
      return []; // No history found, return empty array
    }

    if (typeof result !== "string") {
      throw new Error("Invalid data type: Expected a string");
    }

    if (result) {
      const history = JSON.parse(result) as HistoryEntry[];
      const updatedHistory = history.filter((entry) => entry.uuid !== uuidToDelete);
      await LocalStorage.setItem("uuidHistory", JSON.stringify(updatedHistory));
      return updatedHistory; // Return the updated history after deletion
    } else {
      return []; // No history found, return empty array
    }
  } catch (error) {
    console.error("Failed to delete history entry:", error);
    return []; // Return empty array in case of error
  }
};
