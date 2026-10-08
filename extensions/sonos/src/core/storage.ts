import { LocalStorage } from "@raycast/api";
import { SonosDevice } from "@svrooij/sonos/lib";
import { SonosState } from "@svrooij/sonos/lib/models/sonos-state";

const GROUP_KEY = "active-group";
const STATE_KEY = "state";
const STATE_TTL = 3000;

export async function getActiveGroup(): Promise<string | undefined> {
  try {
    const group = await LocalStorage.getItem<string>(GROUP_KEY);
    return group;
  } catch (error) {
    return undefined;
  }
}

export async function setActiveGroup(group: string | undefined) {
  try {
    await LocalStorage.setItem(GROUP_KEY, group || "");
  } catch (error) {
    return undefined;
  }
}

type StorageStatePayload = {
  timestamp: number;
  sonosState: SonosState;
};

export async function getState(): Promise<StorageStatePayload | null> {
  try {
    const raw = await LocalStorage.getItem<string>(STATE_KEY);
    const state = JSON.parse(raw || "");

    if (state.timestamp + STATE_TTL < Date.now()) {
      return null;
    }

    return state;
  } catch (error) {
    return null;
  }
}

export async function setState(coordinator: SonosDevice): Promise<StorageStatePayload> {
  const sonosState = await coordinator.GetState();
  const payload = {
    timestamp: Date.now(),
    sonosState,
  };

  await LocalStorage.setItem(STATE_KEY, JSON.stringify(payload));

  return payload;
}
