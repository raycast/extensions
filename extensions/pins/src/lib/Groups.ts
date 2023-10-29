/**
 * @module lib/Groups.ts A collection of functions for managing groups. This includes creating, modifying, and deleting groups, as well as getting the next available group ID.
 *
 * @summary Group utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:35:11
 * Last modified  : 2023-09-04 17:35:47
 */

import { useEffect, useState } from "react";
import { getStorage, setStorage } from "./utils";
import { useCachedState } from "@raycast/utils";
import { StorageKey } from "./constants";
import { showToast } from "@raycast/api";
import { Pin } from "./Pins";

/**
 * The method used to sort a group's pins.
 */
export type SortStrategy = "manual" | "alphabetical" | "frequency" | "recency" | "dateCreated";

/**
 * A group of pins.
 */
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

  /**
   * The ID of the parent group.
   */
  parent?: number;

  /**
   * The method used to sort the group's pins.
   */
  sortStrategy?: SortStrategy;

  /**
   * The color to tint the icon.
   */
  iconColor?: string;
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
 * Gets the next available group ID.
 */
export const getNextGroupID = async () => {
  // Get the stored groups
  const storedGroups = await getStorage(StorageKey.LOCAL_GROUPS);

  // Get the next available group ID
  let newID = (await getStorage(StorageKey.NEXT_GROUP_ID))[0] || 1;
  while (storedGroups.some((group: Group) => group.id == newID)) {
    newID++;
  }
  setStorage(StorageKey.NEXT_GROUP_ID, [newID + 1]);
  return newID;
};

/**
 * Creates a new group; updates local storage.
 * @param name The name of the group.
 * @param icon The icon for the group.
 */
export const createNewGroup = async (
  name: string,
  icon: string,
  parent?: number,
  sortStrategy?: SortStrategy,
  iconColor?: string
) => {
  const storedGroups = await getStorage(StorageKey.LOCAL_GROUPS);
  const newID = await getNextGroupID();

  // Add the new group to the stored groups
  const newData = [...storedGroups];
  newData.push({
    name: name,
    icon: icon,
    id: newID,
    parent: parent,
    sortStrategy: sortStrategy,
    iconColor: iconColor,
  });

  // Update the stored groups
  await setStorage(StorageKey.LOCAL_GROUPS, newData);
};

/**
 * Modifies the properties of a group.
 * @param group The group to modify (used to source the group's ID)
 * @param name The (new) name of the group.
 * @param icon The (new) icon for the group.
 * @param pop Function to pop the current view off the navigation stack.
 * @param setGroups Function to update the list of groups.
 * @param parent The (new) parent group ID for the group.
 * @param sortStrategy The (new) sort strategy for the group.
 * @param iconColor The (new) icon color for the group.
 */
export const modifyGroup = async (
  group: Group,
  name: string,
  icon: string,
  pop: () => void,
  setGroups: (groups: Group[]) => void,
  parent?: number,
  sortStrategy?: SortStrategy,
  iconColor?: string
) => {
  const storedGroups = await getStorage(StorageKey.LOCAL_GROUPS);

  const newGroups: Group[] = storedGroups.map((oldGroup: Group) => {
    // Update group if it exists
    if (group.id != -1 && oldGroup.id == group.id) {
      return {
        name: name,
        icon: icon,
        id: group.id,
        parent: parent,
        sortStrategy: sortStrategy,
        iconColor: iconColor,
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
      parent: parent,
      sortStrategy: sortStrategy,
      iconColor: iconColor,
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
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);

  const filteredGroups = storedGroups
    .filter((oldGroup: Group) => {
      return oldGroup.id != group.id;
    })
    .map((g) => {
      if (g.parent == group.id) {
        if (group.parent != undefined) {
          g.parent = group.parent;
        } else {
          g.parent = undefined;
        }
      }
      return g;
    });

  const isDuplicate =
    filteredGroups.filter((oldGroup: Group) => {
      return oldGroup.name == group.name;
    }).length != 0;

  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  const updatedPins = storedPins.map((pin: Pin) => {
    if (pin.group == group.name && !isDuplicate) {
      if (group.parent != undefined) {
        pin.group = storedGroups.filter((g) => g.id == group.parent)[0].name;
      } else {
        pin.group = "None";
      }
    }
    return pin;
  });

  setGroups(filteredGroups);
  await setStorage(StorageKey.LOCAL_GROUPS, filteredGroups);
  await setStorage(StorageKey.LOCAL_PINS, updatedPins);
  await showToast({ title: `Removed pin group!` });
};

/**
 * Checks that the name field is not empty and that the name is not already taken.
 * @param name The value of the name field.
 * @param setNameError A function to set the name error.
 * @param groupNames The names of the existing groups.
 */
export const checkGroupNameField = (
  name: string,
  setNameError: (error: string | undefined) => void,
  groupNames: string[]
) => {
  // Checks for non-empty (non-spaces-only) name
  if (name.trim().length == 0) {
    setNameError("Name cannot be empty!");
  } else if (groupNames.includes(name)) {
    setNameError("A group with this name already exists!");
  } else {
    setNameError(undefined);
  }
};

/**
 * Checks that the entered parent ID is valid (i.e. that a group with that ID exists, and that the group is not the group currently being created).
 * @param suggestedID The value of the parent ID field.
 * @param setParentError A function to set the parent error.
 */
export const checkGroupParentField = async (
  suggestedID: string,
  setParentError: React.Dispatch<React.SetStateAction<string | undefined>>,
  groups: Group[]
) => {
  const nextID = await getStorage(StorageKey.NEXT_GROUP_ID);
  if (suggestedID.trim().length == 0) {
    setParentError(undefined);
  } else if (!groups.map((g) => g.id).includes(parseInt(suggestedID))) {
    setParentError("No group with this ID exists!");
  } else if (parseInt(suggestedID) == nextID) {
    setParentError("Group cannot be its own parent!");
  } else {
    setParentError(undefined);
  }
};
