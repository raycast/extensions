import { Color, List } from "@raycast/api";

import { TimeEntry, TimeEntryMetaData, Workspace } from "@/api";
import { getWorkspaceById } from "@/helpers/workspaces";

export function generateTimeEntryAccessories(timeEntry: TimeEntry & TimeEntryMetaData, workspaces: Workspace[]) {
  const accessories: List.Item.Accessory[] = [...timeEntry.tags.map((tag) => ({ tag }))];

  if (getWorkspaceById(workspaces, timeEntry.workspace_id)?.premium && timeEntry.billable) {
    accessories.push({ tag: { value: "$", color: Color.Magenta } });
  }

  return accessories;
}
