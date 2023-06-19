import { useEffect, useState } from "react";
import { getStorage, setStorage } from "./utils";
import { useCachedState } from "@raycast/utils";
import { StorageKey } from "./constants";
import { showToast } from "@raycast/api";
import { Pin } from "./Pins";

export type Group = {
  /**
   * The name of the group.
   */
  name: string;

  /**
   * A reference to the icon for the group, either a valid Raycast icon, a URL, a file path, or an empty icon placeholder.
   */
  icon: string;

  /**
   * The unique ID of the group.
   */
  id: number;
};

/**
 * Gets the stored groups.
 * @returns The list of groups alongside an update function.
 */
export const useGroups = () => {
  const [groups, setGroups] = useCachedState<Group[]>("pin-groups", []);
  const [loading, setLoading] = useState<boolean>(true);

  const revalidateGroups = async () => {
    const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
    setGroups(storedGroups || []);
    setLoading(false);
  };

  useEffect(() => {
    revalidateGroups();
  }, []);

  return {
    groups: groups,
    setGroups: setGroups,
    loadingGroups: loading,
    revalidateGroups: revalidateGroups,
  };
};

/**
 * Creates a new group; updates local storage.
 * @param name The name of the group.
 * @param icon The icon for the group.
 */
export const createNewGroup = async (name: string, icon: string) => {
  // Get the stored groups
  const storedGroups = await getStorage(StorageKey.LOCAL_GROUPS);

  // Get the next available group ID
  let newID = (await getStorage(StorageKey.NEXT_GROUP_ID))[0] || 1;
  while (storedGroups.some((group: Group) => group.id == newID)) {
    newID++;
  }
  setStorage(StorageKey.NEXT_GROUP_ID, [newID + 1]);

  // Add the new group to the stored groups
  const newData = [...storedGroups];
  newData.push({
    name: name,
    icon: icon,
    id: newID,
  });

  // Update the stored groups
  await setStorage(StorageKey.LOCAL_GROUPS, newData);
};

export const modifyGroup = async (
  group: Group,
  name: string,
  icon: string,
  pop: () => void,
  setGroups: (groups: Group[]) => void
) => {
  const storedGroups = await getStorage(StorageKey.LOCAL_GROUPS);

  const newGroups: Group[] = storedGroups.map((oldGroup: Group) => {
    // Update group if it exists
    if (group.id != -1 && oldGroup.id == group.id) {
      return {
        name: name,
        icon: icon,
        id: group.id,
      };
    } else {
      return oldGroup;
    }
  });

  if (group.id == -1) {
    group.id = (await getStorage(StorageKey.NEXT_GROUP_ID))[0] || 1;
    while (storedGroups.some((storedGroup: Group) => storedGroup.id == group.id)) {
      group.id = group.id + 1;
    }
    setStorage(StorageKey.NEXT_GROUP_ID, [group.id + 1]);

    // Add new group if it doesn't exist
    newGroups.push({
      name: name,
      icon: icon,
      id: group.id,
    });
  }

  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  const newPins = storedPins.map((pin: Pin) => {
    if (pin.group == group.name) {
      return {
        name: pin.name,
        url: pin.url,
        icon: pin.icon,
        group: name,
        id: pin.id,
      };
    } else {
      return pin;
    }
  });

  setGroups(newGroups);
  await setStorage(StorageKey.LOCAL_GROUPS, newGroups);
  await setStorage(StorageKey.LOCAL_PINS, newPins);
  await showToast({ title: `Updated pin group!` });
  pop();
};

/**
 * Deletes a group from local storage.
 * @param group The group to delete.
 * @param setGroups The function to update the active list of groups.
 */
export const deleteGroup = async (group: Group, setGroups: (groups: Group[]) => void) => {
  const storedGroups = await getStorage(StorageKey.LOCAL_GROUPS);

  const filteredGroups = storedGroups.filter((oldGroup: Group) => {
    return oldGroup.id != group.id;
  });

  const isDuplicate =
    filteredGroups.filter((oldGroup: Group) => {
      return oldGroup.name == group.name;
    }).length != 0;

  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  const updatedPins = storedPins.map((pin: Pin) => {
    if (pin.group == group.name && !isDuplicate) {
      return {
        name: pin.name,
        url: pin.url,
        icon: pin.icon,
        group: "None",
        id: pin.id,
      };
    } else {
      return pin;
    }
  });

  setGroups(filteredGroups);
  await setStorage(StorageKey.LOCAL_GROUPS, filteredGroups);
  await setStorage(StorageKey.LOCAL_PINS, updatedPins);
  await showToast({ title: `Removed pin group!` });
};
