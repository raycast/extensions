import { getPreferenceValues } from "@raycast/api";
import { handleOnCatchError } from "../api/errors-helper";
import { YouTrackApi } from "../api/youtrack-api";
import { addMarkdownImages, formatDate } from "../utils";

const MAX_COMMENTS = 10;

type Input = {
  /**
   * The issue id, e.g. `DEMO-1`
   */
  issueId: string;
  /**
   * The number of comments to fetch.
   */
  top?: number;
};

/**
 * Fetches comments from YouTrack for the specified issue.
 */
export default async function getComments(input: Input) {
  const api = YouTrackApi.getInstance();
  const { instance } = getPreferenceValues();
  try {
    const comments = await api.fetchComments(input.issueId, { top: input.top ?? MAX_COMMENTS });
    return comments.map((comment) => ({
      ...comment,
      text: addMarkdownImages(comment, instance),
      attachments: comment.attachments.map((attachment) => ({
        ...attachment,
        url: attachment.url ? `${instance}/${attachment.url}` : null,
      })),
      created: formatDate(comment.created),
    }));
  } catch (error) {
    handleOnCatchError(error, "Error fetching comments");
    throw error;
  }
}
