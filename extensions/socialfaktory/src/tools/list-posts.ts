import { listPosts } from "../lib/socialfaktory";
import type { PostStatus } from "../lib/types";

type Input = {
  /**
   * The ID of the brand to list posts for, as returned by list-brands (it starts with "brand_"). Leave it out to list the posts of every brand.
   */
  brandId?: string;
  /**
   * Only list posts in this status: "draft", "queued" (waiting for the publisher), "scheduled" (will go out at scheduled_at), "published" or "failed". Leave it out to list every status.
   */
  status?: PostStatus;
  /**
   * The page to read, starting at 1. A page holds up to 50 posts ordered by scheduled time, oldest first. The answer says how many pages there are.
   */
  page?: number;
};

export default async function tool(input: Input) {
  return listPosts({ brandId: input.brandId, status: input.status, page: input.page });
}
