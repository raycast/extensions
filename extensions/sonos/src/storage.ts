import { LocalStorage } from "@raycast/api";
import { SonosDevice } from "@svrooij/sonos/lib";
import { SonosState } from "@svrooij/sonos/lib/models/sonos-state";

const keys = {
  activeGroup: "active-group",
};

const STATE_KEY = "state";
const STATE_TTL = 3000;

export async function getActiveGroup(): Promise<string | undefined> {
  const value = await LocalStorage.getItem(keys.activeGroup);

  // If the value is something unexpected, reset it.
  if (typeof value !== "string") {
    setActiveGroup("");
    return undefined;
  }

  return value;
}

export async function setActiveGroup(group: string | undefined) {
  await LocalStorage.setItem(keys.activeGroup, group || "");
}

type StorageStatePayload = {
  timestamp: number;
  sonosState: SonosState;
};

export async function getState(): Promise<StorageStatePayload | null> {
  const raw = await LocalStorage.getItem(STATE_KEY);

  if (typeof raw !== "string" || raw === "") {
    return null;
  }

  try {
    const state = JSON.parse(raw);

    if (state.timestamp + STATE_TTL < Date.now()) {
      return null;
    }

    return state;
  } catch (error) {
    return null;
  }
}

export async function storeState(coordinator: SonosDevice): Promise<StorageStatePayload> {
  const sonosState = await coordinator.GetState();
  const payload = {
    timestamp: Date.now(),
    sonosState,
  };

  await LocalStorage.setItem(STATE_KEY, JSON.stringify(payload));

  return payload;
}
