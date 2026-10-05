import { describe, it, expect, vi, beforeEach } from "vitest";

const gqlMock = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ gql: gqlMock }));

import { createPost } from "./posts";
import type { CreatePostInput } from "./types";

beforeEach(() => {
  gqlMock.mockReset();
  gqlMock.mockResolvedValue({
    createPost: {
      post: {
        id: "post-1",
        status: "scheduled",
        createdAt: "2026-01-01T00:00:00.000Z",
        channelId: "chan1",
        channelService: "twitter",
        shareMode: "share_next",
      },
    },
  });
});

const baseInput: CreatePostInput = {
  channelId: "chan1",
  mode: "shareNow",
};

describe("createPost validation", () => {
  it("throws when a link attachment is combined with assets", async () => {
    await expect(
      createPost({
        ...baseInput,
        assets: [{ image: { url: "https://example.com/a.jpg" } }],
        metadata: {
          facebook: {
            type: "post",
            linkAttachment: { url: "https://example.com" },
          },
        },
      }),
    ).rejects.toThrow(
      "A link attachment cannot be combined with image or video assets",
    );
    expect(gqlMock).not.toHaveBeenCalled();
  });

  it("throws when the link attachment URL is invalid", async () => {
    await expect(
      createPost({
        ...baseInput,
        metadata: {
          facebook: { type: "post", linkAttachment: { url: "not a url" } },
        },
      }),
    ).rejects.toThrow(/not a valid URL/);
  });

  it("throws when an image asset URL is invalid", async () => {
    await expect(
      createPost({ ...baseInput, assets: [{ image: { url: "bad" } }] }),
    ).rejects.toThrow(/Invalid Image URL/);
  });

  it("throws when an image thumbnail URL is invalid", async () => {
    await expect(
      createPost({
        ...baseInput,
        assets: [
          { image: { url: "https://example.com/a.jpg", thumbnailUrl: "bad" } },
        ],
      }),
    ).rejects.toThrow(/Invalid Image thumbnail URL/);
  });

  it("throws when a video asset URL is invalid", async () => {
    await expect(
      createPost({ ...baseInput, assets: [{ video: { url: "bad" } }] }),
    ).rejects.toThrow(/Invalid Video URL/);
  });

  it("throws when a document asset's URL or thumbnail is invalid", async () => {
    await expect(
      createPost({
        ...baseInput,
        assets: [
          {
            document: {
              url: "bad",
              title: "doc",
              thumbnailUrl: "https://example.com/t.jpg",
            },
          },
        ],
      }),
    ).rejects.toThrow(/Invalid Document URL/);

    await expect(
      createPost({
        ...baseInput,
        assets: [
          {
            document: {
              url: "https://example.com/d.pdf",
              title: "doc",
              thumbnailUrl: "bad",
            },
          },
        ],
      }),
    ).rejects.toThrow(/Invalid Document thumbnail URL/);
  });

  it("throws when a link asset URL is invalid", async () => {
    await expect(
      createPost({ ...baseInput, assets: [{ link: { url: "bad" } }] }),
    ).rejects.toThrow(/Invalid Link URL/);
  });
});

describe("createPost happy path", () => {
  it("sends the input as-is, defaulting assets to an empty array", async () => {
    await createPost(baseInput);

    expect(gqlMock).toHaveBeenCalledTimes(1);
    const [, variables] = gqlMock.mock.calls[0];
    expect(variables).toEqual({
      input: { channelId: "chan1", mode: "shareNow", assets: [] },
    });
  });

  it("returns the created post on success", async () => {
    const result = await createPost(baseInput);
    expect(result).toEqual({
      id: "post-1",
      status: "scheduled",
      createdAt: "2026-01-01T00:00:00.000Z",
      channelId: "chan1",
      channelService: "twitter",
      shareMode: "share_next",
    });
  });

  it("throws on an InvalidInputError/LimitReachedError union response", async () => {
    gqlMock.mockResolvedValue({
      createPost: { message: "Post limit reached", code: "LIMIT_REACHED" },
    });

    await expect(createPost(baseInput)).rejects.toThrow("Post limit reached");
  });
});
