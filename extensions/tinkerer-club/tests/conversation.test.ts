import { describe, expect, it, vi } from "vitest";
import { TinkererCommunity } from "../src/api/community";
import { loadConversation } from "../src/lib/conversation";
import { FeedPost } from "../src/lib/feed";

const joinEvent: FeedPost = {
  author: { name: "Ada" },
  commentCount: 0,
  content: "Ada joined Tinkerer Club.",
  id: "activity-1",
  raw: {},
  reactionCount: 1,
  reactions: [],
  type: "MEMBER_JOINED",
};

describe("conversation loading", () => {
  it("does not request a post or comments when the timeline reports zero comments", async () => {
    const post = vi.fn().mockRejectedValue(new Error("Post not found"));
    const comments = vi.fn().mockRejectedValue(new Error("Post not found"));
    const community = {
      client: { baseUrl: "https://app.tinkerer.club" },
      comments,
      post,
    } as unknown as TinkererCommunity;

    await expect(loadConversation(joinEvent, community)).resolves.toEqual({ comments: [], post: joinEvent });
    expect(post).not.toHaveBeenCalled();
    expect(comments).not.toHaveBeenCalled();
  });

  it("loads comments without redundantly requesting a post already supplied by the timeline", async () => {
    const timelinePost = { ...joinEvent, commentCount: 1, id: "post-1", type: "SHORT" };
    const post = vi.fn().mockRejectedValue(new Error("The redundant lookup must not run"));
    const comments = vi.fn().mockResolvedValue([
      {
        author: { name: "Grace" },
        content: "Hello",
        id: "comment-1",
        raw: {},
        reactionCount: 0,
        reactions: [],
      },
    ]);
    const community = {
      client: { baseUrl: "https://app.tinkerer.club" },
      comments,
      post,
    } as unknown as TinkererCommunity;

    await expect(loadConversation(timelinePost, community)).resolves.toMatchObject({
      comments: [{ id: "comment-1" }],
      post: timelinePost,
    });
    expect(comments).toHaveBeenCalledWith("post-1", undefined);
    expect(post).not.toHaveBeenCalled();
  });
});
