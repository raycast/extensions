import { describe, expect, it } from "vitest";
import { parseComments, parseFeedPage, parseFeedPost } from "../src/lib/feed";

describe("feed response parsing", () => {
  it("normalizes posts, authors, reactions, cursors, and relative URLs", () => {
    const page = parseFeedPage(
      {
        data: {
          items: [
            {
              author: { avatarUrl: "/avatars/ollie.png", id: "u1", name: "Ollie", username: "ollie" },
              commentsCount: 2,
              content: "Building a Raycast extension.",
              hashtags: ["raycast", { name: "AI" }],
              id: "p1",
              images: ["/images/demo.png"],
              permalink: "/feed/p1",
              publishedAt: "2026-09-11T10:00:00.000Z",
              reactions: [{ count: 3, emoji: "🔥", viewerReacted: true }],
              type: "SHORT",
            },
          ],
          nextCursor: "cursor-2",
        },
        path: "post.timeline",
      },
      "https://app.tinkerer.club",
    );

    expect(page.nextCursor).toBe("cursor-2");
    expect(page.posts).toHaveLength(1);
    expect(page.posts[0]).toMatchObject({
      author: {
        avatarUrl: "https://app.tinkerer.club/avatars/ollie.png",
        id: "u1",
        name: "Ollie",
        username: "ollie",
      },
      commentCount: 2,
      id: "p1",
      imageUrls: ["https://app.tinkerer.club/images/demo.png"],
      reactionCount: 3,
      topics: ["raycast", "AI"],
      url: "https://app.tinkerer.club/feed/p1",
      viewerReaction: "🔥",
    });
  });

  it("creates a useful fallback for member-joined feed events", () => {
    const page = parseFeedPage(
      { data: { items: [{ author: { name: "Ada" }, id: "joined-1", type: "MEMBER_JOINED" }] } },
      "https://app.tinkerer.club",
    );

    expect(page.posts[0]?.content).toBe("Ada joined Tinkerer Club.");
  });

  it("normalizes a by-ID post response for conversation refreshes", () => {
    const post = parseFeedPost(
      { data: { post: { author: { name: "Lin" }, content: "Refreshed", id: "p2", reactionCount: 6 } } },
      "https://app.tinkerer.club",
    );

    expect(post).toMatchObject({ author: { name: "Lin" }, content: "Refreshed", id: "p2", reactionCount: 6 });
  });

  it("normalizes comments and detects the viewer reaction", () => {
    const comments = parseComments(
      {
        data: {
          comments: [
            {
              authorName: "Grace",
              body: "Useful build!",
              createdAt: "2026-09-11T10:30:00.000Z",
              id: "c1",
              parentId: "c0",
              reactions: { "❤️": 4 },
              viewerReaction: "❤️",
            },
          ],
        },
      },
      "https://app.tinkerer.club",
    );

    expect(comments).toEqual([
      expect.objectContaining({
        author: expect.objectContaining({ name: "Grace" }),
        content: "Useful build!",
        id: "c1",
        parentId: "c0",
        reactionCount: 4,
        viewerReaction: "❤️",
      }),
    ]);
  });
});
