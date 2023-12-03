import { LocalStorage } from "@raycast/api";

const keys = {
  activeGroup: "active-group",
};

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
