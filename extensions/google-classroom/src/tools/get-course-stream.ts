import { Issue, getCourseStream } from "../api/classroom";
import { withGoogleAuth } from "../components/withGoogleAuth";

type Input = {
  /**
   * The ID of the course. Use the `get-courses` tool to find it.
   */
  courseId: string;

  /**
   * Only return posts of this type. Returns every post when omitted.
   */
  type?: "announcement" | "assignment" | "question" | "material";
};

/**
 * Lists the announcements, assignments, questions and materials posted in a course, most recent first.
 * `failedToLoad` names the kinds of posts that couldn't be loaded and are therefore missing from the list.
 */
export default withGoogleAuth(async function (input: Input) {
  const failedToLoad: Issue[] = [];
  const { items, topics } = await getCourseStream(input.courseId, { issues: failedToLoad });

  return {
    posts: items
      .filter((item) => !input.type || item.type === input.type)
      .map((item) => ({ ...item, topic: item.topicId && topics[item.topicId] })),
    failedToLoad,
  };
});
