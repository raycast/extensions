import { Issue, getCourses } from "../api/classroom";
import { withGoogleAuth } from "../components/withGoogleAuth";

/**
 * Lists the user's active and archived Google Classroom courses, with their teachers.
 */
export default withGoogleAuth(async function () {
  const failedToLoad: Issue[] = [];
  const courses = await getCourses({ withTeachers: true, issues: failedToLoad });
  return { courses, failedToLoad };
});
