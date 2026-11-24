import { describe, expect, it, vi } from "vitest";
import { TinkererCommunity } from "../src/api/community";
import { TinkererApiClient } from "../src/api/client";

describe("community threads", () => {
  it("returns a post with no comments without requesting the empty comments endpoint", async () => {
    const call = vi.fn().mockImplementation(({ path }: { path: string }) => {
      if (path === "post.byId") {
        return Promise.resolve({
          data: {
            post: {
              commentsCount: 0,
              content: "A new post",
              id: "post-1",
            },
          },
        });
      }
      return Promise.reject(new Error("Post not found"));
    });
    const client = { baseUrl: "https://app.tinkerer.club", call } as unknown as TinkererApiClient;

    await expect(new TinkererCommunity(client).thread("post-1")).resolves.toEqual({
      comments: [],
      post: {
        post: {
          commentsCount: 0,
          content: "A new post",
          id: "post-1",
        },
      },
    });
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith({ path: "post.byId", type: "query" }, { id: "post-1" }, undefined);
  });

  it("requests comments when the post does not report a comment count", async () => {
    const call = vi.fn().mockImplementation(({ path }: { path: string }) => {
      if (path === "post.byId") return Promise.resolve({ data: { post: { id: "post-2" } } });
      return Promise.resolve({ data: { comments: [{ content: "Hello", id: "comment-1" }] } });
    });
    const client = { baseUrl: "https://app.tinkerer.club", call } as unknown as TinkererApiClient;

    await expect(new TinkererCommunity(client).thread("post-2")).resolves.toMatchObject({
      comments: { comments: [{ id: "comment-1" }] },
      post: { post: { id: "post-2" } },
    });
    expect(call).toHaveBeenCalledTimes(2);
  });
});
