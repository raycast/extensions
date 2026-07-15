import { LocalStorage } from "@raycast/api";

type Space = {
  id: string;
};

export async function getInitialSpaceId(key: string, spaces: Space[]) {
  const storedSpaceId = await LocalStorage.getItem<string>(key);
  return spaces.find((space) => space.id === storedSpaceId)?.id ?? spaces[0]?.id;
}

export function setStoredSpaceId(key: string, spaceId: string) {
  return LocalStorage.setItem(key, spaceId);
}
