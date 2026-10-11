import { getPreferenceValues } from "@raycast/api";
import { AssignmentGroup } from "../api/classroom";
import { normalizeSettings } from "./model";

type ClassroomPreferences = {
  groupAssignments?: boolean;
  assignmentGroup1?: AssignmentGroup;
  assignmentGroup2?: AssignmentGroup;
  assignmentGroup3?: AssignmentGroup;
  assignmentGroup4?: AssignmentGroup;
  assignmentGroup5?: AssignmentGroup;
  searchTeachers?: boolean;
};
export function readSettings() {
  const preferences = getPreferenceValues<ClassroomPreferences>();
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
