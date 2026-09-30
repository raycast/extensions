import { Action, Tool } from "@raycast/api";
import { cancelScheduledPost, getScheduledPosts, parseApiDate, platformName } from "../api";

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
  let post;
  try {
    const { scheduled_posts } = await getScheduledPosts();
    post = scheduled_posts.find((p) => p.job_id === input.jobId);
  } catch {
    post = undefined;
  }
  return {
    style: Action.Style.Destructive,
    message: "Cancel this scheduled post? It won't be published.",
    info: [
      { name: "Job ID", value: input.jobId },
      { name: "Title", value: post?.title },
      { name: "Profile", value: post?.profile_username },
      { name: "Platforms", value: post?.platforms?.map(platformName).join(", ") },
      { name: "Scheduled For", value: parseApiDate(post?.scheduled_date)?.toLocaleString() },
    ],
  };
};
