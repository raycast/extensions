import { describe, expect, it } from "vitest";
import { mergeArticle, parseArticle, parseArticles } from "../src/lib/article";

describe("article response parsing", () => {
  it("normalizes the live directory shape and relative media URLs", () => {
    const articles = parseArticles(
      {
        data: [
          {
            author: {
              avatarImageUrl: "/api/media/avatars/anson.png",
              id: "u1",
              name: "Anson",
              username: "anson",
            },
            id: "a1",
            metaImageUrl: "/api/media/posts/a1.png",
            publishedAt: "2026-09-09T16:10:46.692Z",
            slug: "watch-how-a-product-works",
            title: "I want to watch how a product works",
          },
        ],
        path: "post.articleDirectory",
      },
      "https://app.tinkerer.club",
    );

    expect(articles).toEqual([
      expect.objectContaining({
        author: expect.objectContaining({
          avatarUrl: "https://app.tinkerer.club/api/media/avatars/anson.png",
          name: "Anson",
          username: "anson",
        }),
        coverUrl: "https://app.tinkerer.club/api/media/posts/a1.png",
        id: "a1",
        isDraft: false,
        slug: "watch-how-a-product-works",
        title: "I want to watch how a product works",
        url: "https://app.tinkerer.club/posts/a1",
      }),
    ]);
  });

  it("accepts paged collections and marks drafts", () => {
    const articles = parseArticles(
      { data: { items: [{ authorName: "Olli", content: "Work in progress", id: "d1", title: "Draft" }] } },
      "https://app.tinkerer.club",
      true,
    );

    expect(articles[0]).toMatchObject({ author: { name: "Olli" }, id: "d1", isDraft: true, title: "Draft" });
  });

  it("merges full article content without dropping directory metadata", () => {
    const summary = parseArticle(
      { id: "a1", metaImageUrl: "/cover.png", title: "Article", author: { name: "Ada" }, topics: ["AI"] },
      "https://app.tinkerer.club",
    );
    const detail = parseArticle(
      { id: "a1", title: "Article", author: { name: "Ada" }, content: "Full text" },
      "https://app.tinkerer.club",
    );

    expect(summary).toBeDefined();
    expect(mergeArticle(summary!, detail)).toMatchObject({
      content: "Full text",
      coverUrl: "https://app.tinkerer.club/cover.png",
      topics: ["AI"],
    });
  });
});
