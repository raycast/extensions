/**
 * @module lib/Groups.ts A collection of functions for managing groups. This includes creating, modifying, and deleting groups, as well as getting the next available group ID.
 *
 * @summary Group utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:35:11
 * Last modified  : 2023-11-01 00:44:06
 */

import { useEffect, useState } from "react";
import { getStorage, setStorage } from "./storage";
import { useCachedState } from "@raycast/utils";
import { SORT_FN, SORT_STRATEGY, StorageKey } from "./constants";
import { showToast } from "@raycast/api";
import { Pin, sortPins } from "./Pins";

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
  sortStrategy?: keyof typeof SORT_STRATEGY;

  /**
   * The color to tint the icon.
   */
  iconColor?: string;

  /**
   * The date the group was created.
   */
  dateCreated?: string;
};

/**
 * The keys of an {@link Group} object.
 */
export const GroupKeys = ["name", "icon", "id", "parent", "sortStrategy", "iconColor", "dateCreated"];

/**
 * Checks if an object is a group.
 * @param obj The item to check.
 * @returns Whether or not the item is a group.
 */
export const isGroup = (obj: object): obj is Group => {
  return (obj as Pin).url == undefined;
};

/**
 * Gets the stored groups.
 * @returns The list of groups alongside an update function.
 */
export const useGroups = () => {
  const [groups, setGroups] = useCachedState<Group[]>("pin-groups", []);
  const [loading, setLoading] = useState<boolean>(true);

  const revalidateGroups = async () => {
    setLoading(true);
    const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
    const checkedGroups: Group[] = [];
    for (const group of storedGroups) {
      checkedGroups.push({
        ...group,
        id: group.id == undefined ? await getNextGroupID() : group.id,
      });
    }
    setGroups(checkedGroups);
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
  sortStrategy?: keyof typeof SORT_STRATEGY,
  iconColor?: string,
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
    dateCreated: new Date().toUTCString(),
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
  sortStrategy?: keyof typeof SORT_STRATEGY,
  iconColor?: string,
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
        dateCreated: group.dateCreated || new Date().toUTCString(),
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
      dateCreated: new Date().toUTCString(),
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
export const deleteGroup = async (group: Group, setGroups: (groups: Group[]) => void, displayToast = true) => {
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);

  const filteredGroups = storedGroups
    .filter((oldGroup: Group) => {
      return oldGroup.id != group.id;
    })
    .map((g) => {
      if (g.parent == group.id) {
        if (group.parent != undefined && storedGroups.some((g) => g.id == group.parent)) {
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
      if (group.parent != undefined && storedGroups.some((g) => g.id == group.parent)) {
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
  if (displayToast) await showToast({ title: `Removed pin group!` });
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
  groupNames: string[],
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
  groups: Group[],
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

/**
 * Gets the list of pins in a given group. If `recursive` is true, then the list of pins will include the pins of the subgroups, and so on.
 * @param group The group to get the pins of.
 * @param groups The list of all groups.
 * @param pins The list of all pins.
 * @param recursive Whether or not to recursively search for pins.
 */
export const getMemberPins = (group: Group, groups: Group[], pins: Pin[], recursive = false) => {
  const memberPins: Pin[] = [];
  for (const pin of pins) {
    if (pin.group == group.name || (recursive && getSubgroups(group, groups, true).some((g) => g.name == pin.group))) {
      memberPins.push(pin);
    }
  }
  return memberPins;
};

/**
 * Gets the list of subgroups of a given group. If `recursive` is true, then the list of subgroups will include the subgroups of the subgroups, and so on.
 * @param group The group to get the subgroups of.
 * @param groups The list of all groups.
 * @param recursive Whether or not to recursively search for subgroups.
 * @returns The list of subgroups.
 */
export const getSubgroups = (group: Group, groups: Group[], recursive = false) => {
  const subgroups: Group[] = [];
  for (const g of groups) {
    if (recursive && g.parent == group.id) {
      subgroups.push(g, ...getSubgroups(g, groups));
    } else if (g.parent == group.id) {
      subgroups.push(g);
    }
  }
  return subgroups;
};

/**
 * Gets the statistics (i.e. usage and creation info, not just raw stats) for a given group as either a string (default) or an object. In string form, each statistic is separated by two newlines.
 *
 * @param group The groups to get statistics for.
 * @param groups The list of all groups.
 * @param pins The list of all pins.
 * @param format The format to return the statistics in. Defaults to "string".
 * @returns The statistics for the group.
 */
export const getGroupStatistics = (
  group: Group,
  groups: Group[],
  pins: Pin[],
  format: "string" | "object" = "string",
) => {
  const dateFormat: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  };

  const formattedDateCreated = group.dateCreated
    ? new Date(group.dateCreated).toLocaleDateString(undefined, dateFormat)
    : new Date().toLocaleDateString(undefined, dateFormat);

  const subgroups = getSubgroups(group, groups, true);
  const memberPins = getMemberPins(group, groups, pins);
  const allMemberPins = getMemberPins(group, groups, pins, true);

  const mostUsedPin = sortPins(allMemberPins, groups, undefined, SORT_FN.MOST_FREQUENT)[0];
  const leastUsedPin = sortPins(allMemberPins, groups, undefined, SORT_FN.LEAST_FREQUENT)[0];

  if (format == "object") {
    return {
      dateCreated: formattedDateCreated,
      topLevelPins: memberPins.length,
      totalPins: allMemberPins.length,
      totalSubgroups: subgroups.length,
      mostUsedPin: `${
        mostUsedPin?.timesOpened
          ? `${mostUsedPin.name} (${mostUsedPin.timesOpened} time${mostUsedPin.timesOpened == 1 ? "" : "s"})`
          : "N/A"
      }`,
      leastUsedPin: `${
        leastUsedPin?.timesOpened
          ? `${leastUsedPin.name} (${leastUsedPin.timesOpened} time${leastUsedPin.timesOpened == 1 ? "" : "s"})`
          : "N/A"
      }`,
    };
  }

  const dateCreatedText = `Date Created: ${formattedDateCreated}`;
  const topLevelPinsText = `# of Top-Level Pins: ${memberPins.length}`;
  const totalPinsText = `Total # of Pins: ${allMemberPins.length}`;
  const totalSubgroupsText = `Total # of Subgroups: ${subgroups.length}`;

  const mostUsedPinText = `Most Used Pin: ${
    mostUsedPin?.timesOpened
      ? `${mostUsedPin.name} (${mostUsedPin.timesOpened} time${mostUsedPin.timesOpened == 1 ? "" : "s"})`
      : "N/A"
  }`;
  const leastUsedPinText = `Least Used Pin: ${
    leastUsedPin?.timesOpened
      ? `${leastUsedPin.name} (${leastUsedPin.timesOpened} time${leastUsedPin.timesOpened == 1 ? "" : "s"})`
      : "N/A"
  }`;

  return [dateCreatedText, topLevelPinsText, totalPinsText, totalSubgroupsText, mostUsedPinText, leastUsedPinText].join(
    "\n\n",
  );
};
