import { getPreferenceValues } from "@raycast/api";
import { AssignmentGroup } from "../api/classroom";
import { normalizeSettings } from "./model";

export function readSettings() {
  const preferences = getPreferenceValues<Preferences>();
  return normalizeSettings({
    groupAssignments: preferences.groupAssignments,
    groupOrder: [
      preferences.assignmentGroup1,
      preferences.assignmentGroup2,
      preferences.assignmentGroup3,
      preferences.assignmentGroup4,
      preferences.assignmentGroup5,
    ].filter((group): group is AssignmentGroup => !!group),
    searchTeachers: preferences.searchTeachers,
  });
}
