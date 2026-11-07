import { AssignmentFilter, Issue, getAssignments, getStatus, matchesFilter } from "../api/classroom";
import { getHiddenCourseIds } from "../settings/hiddenCourses";
import { withGoogleAuth } from "../components/withGoogleAuth";

type Input = {
  /**
   * Which assignments to return. Defaults to `all`.
   *
   * - `all`: every assignment
   * - `missing`: past due and not turned in
   * - `dueSoon`: not turned in and due within the next 7 days
   * - `due`: not turned in with a due date in the future
   * - `noDueDate`: not turned in and without a due date
   * - `done`: turned in or returned
   */
  filter?: "all" | "missing" | "dueSoon" | "due" | "noDueDate" | "done";
};

/**
 * Lists the assignments and questions across the user's active courses, each with its course, due date (UTC),
 * status, grade, attachments and the user's submission (submitted files or answer). Courses the user hid from
 * their assignments are left out. `failedToLoad` names the courses whose assignments
 * couldn't be loaded and are therefore missing from the list.
 */
export default withGoogleAuth(async function (input: Input) {
  const filter: AssignmentFilter = input.filter ?? "all";
  const failedToLoad: Issue[] = [];
  const assignments = await getAssignments({
    hiddenCourseIds: await getHiddenCourseIds(),
    issues: failedToLoad,
  });

  return {
    assignments: assignments
      .filter((assignment) => matchesFilter(assignment, filter))
      .map(({ course, ...assignment }) => ({ ...assignment, status: getStatus(assignment), courseName: course.name })),
    failedToLoad,
  };
});
