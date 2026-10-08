import { getPreferenceValues } from "@raycast/api";

import { getGroups, getMemberPins, Group } from "./Groups";
import { getPins, isPinDisabled, openPin } from "./Pins";
import { ExtensionPreferences } from "./preferences";

export type OpenPinGroupResult = {
  group?: Group;
  opened: number;
  failed: number;
  skippedDisabled: number;
  total: number;
};

/**
 * Opens all direct member pins of a group.
 * @param groupId The ID of the group to open.
 * @returns The matched group and number of opened pins.
 */
export const openPinGroup = async (groupId: string | number): Promise<OpenPinGroupResult> => {
  const [groups, pins] = await Promise.all([getGroups(), getPins()]);
  const group = groups.find((candidate) => candidate.id.toString() == groupId.toString());
  if (!group) return { opened: 0, failed: 0, skippedDisabled: 0, total: 0 };

  const groupPins = getMemberPins(group, groups, pins);
  const preferences = getPreferenceValues<ExtensionPreferences>();
  let opened = 0;
  let failed = 0;
  let skippedDisabled = 0;
  for (const pin of groupPins) {
    if (isPinDisabled(pin, groups)) {
      skippedDisabled++;
      continue;
    }

    try {
      if (await openPin(pin, preferences, undefined, groups)) opened++;
      else failed++;
    } catch (error) {
      console.error(error);
      failed++;
    }
  }

  return { group, opened, failed, skippedDisabled, total: groupPins.length };
};
