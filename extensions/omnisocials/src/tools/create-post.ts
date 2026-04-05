import { createPost, createAndPublishPost, listAccounts } from "../lib/api";

type Input = {
  /**
   * The text content for the post.
   */
  content: string;

  /**
   * Account IDs to post to. If not provided, lists available accounts first.
   */
  accounts?: string[];

  /**
   * Content type: "post" (default), "story" (Instagram/Facebook/Snapchat), or "reel" (Instagram/Facebook/YouTube/TikTok).
   */
  type?: "post" | "story" | "reel";

  /**
   * ISO 8601 date string to schedule the post. If not provided, saves as draft.
   */
  schedule_at?: string;

  /**
   * Whether to publish immediately. Defaults to false.
   */
  publish_now?: boolean;

  /**
   * URLs of media to attach to the post.
   */
  media_urls?: string[];
};

export default async function tool(input: Input) {
  const postData = {
    content: { default: input.content },
    accounts: input.accounts || [],
    ...(input.type ? { type: input.type } : {}),
    ...(input.schedule_at ? { schedule_at: input.schedule_at } : {}),
    ...(input.media_urls ? { media_urls: input.media_urls } : {}),
  };

  if (input.accounts && input.accounts.length === 0) {
    const accountsResponse = await listAccounts();
    return {
      message: "No accounts specified. Here are the available accounts:",
      accounts: accountsResponse.data.map((a) => ({
        id: a.id,
        platform: a.platform,
        username: a.username,
        display_name: a.display_name,
      })),
    };
  }

  if (input.publish_now) {
    const response = await createAndPublishPost(postData);
    return { message: "Post published successfully!", post: response.data };
  }

  const response = await createPost(postData);
  const action = input.schedule_at ? "scheduled" : "saved as draft";
  return { message: `Post ${action} successfully!`, post: response.data };
}
