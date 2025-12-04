import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { useState } from "react";

const { bearerToken } = getPreferenceValues<Preferences>();
export const API_URL = "https://api.capacities.io";
export const API_HEADERS = {
  Accept: "application/json",
  Authorization: `Bearer ${bearerToken}`,
  "Content-Type": "application/json",
};
const SPACES_UPDATE_INTERVAL = 1000 * 60 * 10;
const SPACE_INFO_UPDATE_INTERVAL = 1000 * 60 * 10;

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

export function fetchErrorHandler(status: number) {
  if (status === 429) {
    return "Too Many Requests. Please try again later.";
  } else if (status === 400) {
    return "Invalid request. Please try again.";
  } else if (status === 401) {
    return "Unauthorized. Please check your API key.";
  } else if (status === 500) {
    return "Something went wrong.";
  } else if (status === 503 || status === 555) {
    return "Service Unavailable. Please try again later.";
  } else {
    return "Request failed. You might be offline, please try again when back online.";
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

export async function loadAndSaveCapacitiesStore(forceUpdate: boolean, throwError: boolean): Promise<CapacitiesStore> {
  let errorMessage: string | undefined = undefined;
  let store: CapacitiesStore | undefined = undefined;
  try {
    store = await getCapacitiesStore();
    if (
      forceUpdate ||
      !store.spacesLastUpdated ||
      Date.now() - new Date(store.spacesLastUpdated).getTime() > SPACES_UPDATE_INTERVAL
    ) {
      try {
        const response = await fetch(`${API_URL}/spaces`, {
          headers: API_HEADERS,
        });
        if (!response.ok) throw new Error(fetchErrorHandler(response.status));
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
      } catch (e) {
        errorMessage = `${e}`;
      }
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
      try {
        const response = await fetch(`${API_URL}/space-info?spaceid=${spaceId}`, {
          headers: API_HEADERS,
        });
        if (!response.ok) throw new Error(fetchErrorHandler(response.status));
        const result = (await response.json()) as GetSpaceInfoResponse;
        const data = result;
        store.spacesInfo[spaceId] = {
          lastUpdated: new Date().toISOString(),
          structures: data.structures,
        };
      } catch (e) {
        errorMessage = `${e}`;
      }
    }

    if (errorMessage && throwError) throw new Error(errorMessage);

    await LocalStorage.setItem("capacitiesStore", JSON.stringify(store));
    return store;
  } catch {
    if (!throwError && store) return store;
    throw new Error(errorMessage || "Failed to load Capacities store");
  }
}

export function useCapacitiesStore(forceUpdate = false) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
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
        console.error(e?.message);
        setError("Failed to load Capacities store");
      });

    loadAndSaveCapacitiesStore(forceUpdate, false)
      .then((store) => {
        setStore(store);
        if (store.spacesLastUpdated) {
          setIsLoading(false);
        } else {
          setError("Failed to load Capacities store");
        }
      })
      .catch((e) => {
        setError(e?.message || "Failed to load Capacities store");
      });
  }

  return { store, isLoading, error, triggerLoading };
}
