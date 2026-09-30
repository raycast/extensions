import { Action, Tool } from "@raycast/api";
import { cancelScheduledPost, getAllScheduledPosts, parseApiDate, platformName, UploadPostError } from "../api";

type Input = {
  /**
   * The job_id of the scheduled or queued post to cancel. Get it from the get-scheduled-posts tool.
   */
  jobId: string;
};

export default async function tool(input: Input) {
  return cancelScheduledPost(input.jobId);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Only ask to cancel a post we can show to the user. If it can't be identified, stop here and let the AI
  // retry or look the job up again, instead of confirming a destructive action blind.
  let posts;
  try {
    posts = (await getAllScheduledPosts()).scheduled_posts;
  } catch (error) {
    throw new UploadPostError(
      `Could not load the scheduled posts to identify job ${input.jobId}. Try again. (${(error as Error).message})`,
    );
  }
  const post = posts.find((p) => p.job_id === input.jobId);
  if (!post) {
    throw new UploadPostError(
      `No scheduled post with job_id ${input.jobId}. It may have been published or cancelled already; list the scheduled posts again to find the right one.`,
    );
  }
  return {
    style: Action.Style.Destructive,
    message: "Cancel this scheduled post? It won't be published.",
    info: [
      { name: "Job ID", value: input.jobId },
      { name: "Title", value: post.title || post.source_filename || "Untitled post" },
      { name: "Profile", value: post.profile_username },
      { name: "Platforms", value: post.platforms?.map(platformName).join(", ") },
      { name: "Scheduled For", value: parseApiDate(post.scheduled_date)?.toLocaleString() },
    ],
  };
};
