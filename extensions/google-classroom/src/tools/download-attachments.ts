import { Issue, getCourseStream } from "../api/classroom";
import { withGoogleAuth } from "../components/withGoogleAuth";
import { downloadAttachments } from "../helpers/files";

type Input = {
  /**
   * The ID of the course the post belongs to.
   */
  courseId: string;

  /**
   * The ID of the assignment, question, announcement or material whose attachments should be downloaded.
   * Use the `get-assignments` or `get-course-stream` tool to find it.
   */
  postId: string;

  /**
   * Set to `true` to download the files the user submitted for the assignment instead of the attachments of the post.
   */
  submission?: boolean;
};

/**
 * Downloads the Google Drive attachments of a post, or the files the user submitted for it, to a new folder in
 * Downloads and returns the downloaded paths, along with the names of the files that were `skipped` for having no
 * downloadable format (Google Forms, Sites…) and of those that `failed`. Other files (PDFs, ZIPs, images…) are downloaded as is.
 * Google Docs, Sheets and Slides are exported to Word, Excel and PowerPoint, Google Drawings to PDF.
 */
export default withGoogleAuth(async function (input: Input) {
  // Whatever else of the course fails to load only matters when it could be what holds the post
  const issues: Issue[] = [];
  const { items } = await getCourseStream(input.courseId, { issues });
  const item = items.find(({ id }) => id === input.postId);
  if (!item) {
    const unavailable = issues.map(({ title, message }) => `${title} (${message})`).join(", ");
    throw new Error(
      `No post with ID ${input.postId} was found in this course` +
        (unavailable ? `, but these couldn't be loaded: ${unavailable}` : ""),
    );
  }

  const attachments = input.submission ? (item.submission?.attachments ?? []) : item.attachments;
  const folderName = input.submission ? `${item.title} (Submission)` : item.title;

  const result = await downloadAttachments(attachments, { folderName });
  if (result.paths.length === 0) {
    throw new Error(
      result.failed[0]?.message ??
        `"${item.title}" has no downloadable ${input.submission ? "submitted files" : "attachments"}`,
    );
  }
  return result;
});
