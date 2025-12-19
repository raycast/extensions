import { LocalStorage, Toast, getPreferenceValues, open, openExtensionPreferences, showToast } from "@raycast/api";
import { useState } from "react";

const { communicationToken } = getPreferenceValues<Preferences>();
export const API_URL = "http://localhost:10334";
export const API_HEADERS = {
  Accept: "application/json",
  Authorization: `Bearer ${communicationToken}`,
  "Content-Type": "application/json",
};
const SPACES_UPDATE_INTERVAL = 0;
const SPACE_INFO_UPDATE_INTERVAL = 0;

// API TYPES
type GetSpacesInfoResponse = {
  spaces: {
    id: string;
    title: string;
    icon: unknown;
  }[];
};

type GetSpaceInfoResponse = {
  structures: {
    id: string;
    title: string;
    pluralName: string;
    propertyDefinitions: {
      type: string;
      id: string;
      dataType: string;
      name: string;
    }[];
    labelColor: string;
    collections: {
      id: string;
      title: string;
    }[];
  }[];
};

type CapacitiesStore = {
  spacesLastUpdated: string | undefined;
  spaces: { id: string; title: string }[];
  spacesInfo: {
    [key: string]:
      | {
          lastUpdated: string;
          structures: GetSpaceInfoResponse["structures"];
        }
      | undefined;
  };
};

export function handleAPIError(response: Response) {
  if (response.ok) return;
  const status = response.status;
  if (status === 401) {
    showToast({
      style: Toast.Style.Failure,
      title: "You're communication token is invalid",
      message: "Please update your communication token in the extension preferences and try again.",
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: () => openExtensionPreferences(),
        shortcut: {
          modifiers: ["cmd"],
          key: "o",
        },
      },
    });
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: `Error Message: ${response.status} - ${response.statusText}`,
    });
  }
}

export function handleUnexpectedError(error: Error) {
  if (error.message.includes("fetch failed")) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot connect",
      message:
        "Capacities needs to be open for the extension to work. Please open Capacities and try again. If the problem persists, please check if you activated the extension in the Capacities settings.",
      primaryAction: {
        title: "Open Capacities",
        onAction: () => open("capacities://", "Capacities"),
        shortcut: {
          modifiers: ["cmd"],
          key: "o",
        },
      },
    });
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "An unexpected error occurred",
      message: `Capacities needs to be open for the extension to work. Please open Capacities and try again. If the problem persists, please check if you activated the extension in the Capacities settings. (Error Message: ${error.message})`,
      primaryAction: {
        title: "Open Capacities",
        onAction: () => open("capacities://", "Capacities"),
        shortcut: {
          modifiers: ["cmd"],
          key: "o",
        },
      },
    });
  }
}

async function getCapacitiesStore(): Promise<CapacitiesStore> {
  const store = await LocalStorage.getItem<string>("capacitiesStore");
  if (store) {
    return JSON.parse(store);
  } else {
    return {
      spacesLastUpdated: undefined,
      spaces: [],
      spacesInfo: {},
    };
  }
}

export async function loadAndSaveCapacitiesStore(forceUpdate: boolean): Promise<CapacitiesStore | undefined> {
  let store: CapacitiesStore | undefined = undefined;
  try {
    store = await getCapacitiesStore();
    if (
      forceUpdate ||
      !store.spacesLastUpdated ||
      Date.now() - new Date(store.spacesLastUpdated).getTime() > SPACES_UPDATE_INTERVAL
    ) {
      const response = await fetch(`${API_URL}/spaces`, {
        headers: API_HEADERS,
      });

      if (!response.ok) {
        handleAPIError(response);
        return store;
      }
      const result = (await response.json()) as GetSpacesInfoResponse;
      const data = result;

      if (data.spaces) {
        store.spaces = data.spaces.map((el) => {
          return {
            id: el.id,
            title: el.title,
          };
        });
      }
      const spaces = data?.spaces || [];
      for (const space of spaces) {
        const index = store.spaces.findIndex((s) => s.id === space.id);
        if (index === -1) {
          store.spaces.push({
            id: space.id,
            title: space.title,
          });
        } else {
          store.spaces[index] = {
            id: space.id,
            title: space.title,
          };
        }
      }
      store.spacesLastUpdated = new Date().toISOString();
    }

    const spaceIdsToUpdate: string[] = [];
    for (const [spaceId, spaceInfo] of Object.entries(store.spacesInfo)) {
      if (!store.spaces.find((s) => s.id === spaceId)) {
        delete store.spacesInfo[spaceId];
      } else {
        if (
          forceUpdate ||
          !spaceInfo?.lastUpdated ||
          Date.now() - new Date(spaceInfo?.lastUpdated).getTime() > SPACE_INFO_UPDATE_INTERVAL
        ) {
          spaceIdsToUpdate.push(spaceId);
        }
      }
    }

    for (const space of store.spaces) {
      if (!store.spacesInfo[space.id]) {
        spaceIdsToUpdate.push(space.id);
      }
    }

    for (const spaceId of spaceIdsToUpdate) {
      const response = await fetch(`${API_URL}/space-info?spaceid=${spaceId}`, {
        headers: API_HEADERS,
      });
      if (!response.ok) {
        handleAPIError(response);
        return store;
      }
      const result = (await response.json()) as GetSpaceInfoResponse;
      const data = result;
      store.spacesInfo[spaceId] = {
        lastUpdated: new Date().toISOString(),
        structures: data.structures,
      };
    }

    await LocalStorage.setItem("capacitiesStore", JSON.stringify(store));
    return store;
  } catch (e) {
    if (e instanceof Error) {
      handleUnexpectedError(e);
    } else {
      console.log(e);
    }
    return undefined;
  }
}

export function useCapacitiesStore(forceUpdate = false) {
  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<CapacitiesStore | undefined>(undefined);

  function triggerLoading() {
    getCapacitiesStore()
      .then((store) => {
        setStore(store);
        if (store.spacesLastUpdated) {
          setIsLoading(false);
        }
      })
      .catch((e) => {
        if (e instanceof Error) {
          handleUnexpectedError(e);
        } else {
          console.log(e);
        }
      });

    loadAndSaveCapacitiesStore(forceUpdate).then((store) => {
      if (!store) return;
      setStore(store);
      if (store.spacesLastUpdated) {
        setIsLoading(false);
      } else {
        handleUnexpectedError(new Error("Failed to load Capacities store"));
      }
    });
  }

  return { store, isLoading, triggerLoading };
}
