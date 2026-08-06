import { getPreferenceValues } from "@raycast/api";

import { getGroups, getMemberPins, Group } from "./Groups";
import { getPins, openPin } from "./Pins";
import { ExtensionPreferences } from "./preferences";

export type OpenPinGroupResult = {
  group?: Group;
  opened: number;
};

/**
 * Opens all direct member pins of a group.
 * @param groupId The ID of the group to open.
 * @returns The matched group and number of opened pins.
 */
export const openPinGroup = async (groupId: string | number): Promise<OpenPinGroupResult> => {
  const [groups, pins] = await Promise.all([getGroups(), getPins()]);
  const group = groups.find((candidate) => candidate.id.toString() == groupId.toString());
  if (!group) return { opened: 0 };

  const groupPins = getMemberPins(group, groups, pins);
  const preferences = getPreferenceValues<ExtensionPreferences>();
  await Promise.all(groupPins.map((pin) => openPin(pin, preferences)));

  return { group, opened: groupPins.length };
};
