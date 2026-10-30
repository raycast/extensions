import { describe, expect, it } from "vitest";
import { describeInstagramReply, mediaFromQueryReply } from "./instagram-direct";

/** The shapes Instagram's web query returns for a post; every URL is fake. */
const cdn = (name: string) => `https://scontent.example/v/${name}?oh=00_sig&oe=6AEADF11`;
const reply = (media: unknown) => ({ data: { xdt_shortcode_media: media }, status: "ok" });

describe("mediaFromQueryReply", () => {
  it("reads a photo, a video, and a carousel in order", () => {
    expect(mediaFromQueryReply(reply({ __typename: "XDTGraphImage", display_url: cdn("a.jpg") }))).toEqual([
      cdn("a.jpg"),
    ]);
    expect(
      mediaFromQueryReply(
        reply({ __typename: "XDTGraphVideo", display_url: cdn("poster.jpg"), video_url: cdn("v.mp4") }),
      ),
    ).toEqual([cdn("v.mp4")]);
    const carousel = {
      __typename: "XDTGraphSidecar",
      edge_sidecar_to_children: {
        edges: [
          { node: { display_url: cdn("1.jpg") } },
          { node: { display_url: cdn("2-poster.jpg"), video_url: cdn("2.mp4"), is_video: true } },
        ],
      },
    };
    expect(mediaFromQueryReply(reply(carousel))).toEqual([cdn("1.jpg"), cdn("2.mp4")]);
  });

  it("never saves a video's poster in its place", () => {
    expect(mediaFromQueryReply(reply({ __typename: "XDTGraphVideo", display_url: cdn("poster.jpg") }))).toBeNull();
    const carousel = {
      __typename: "XDTGraphSidecar",
      edge_sidecar_to_children: { edges: [{ node: { display_url: cdn("p.jpg"), is_video: true } }] },
    };
    expect(mediaFromQueryReply(reply(carousel))).toBeNull();
  });

  it("returns null for an empty reply, an unknown type, or a non-https link", () => {
    expect(mediaFromQueryReply(reply(null))).toBeNull();
    expect(mediaFromQueryReply({})).toBeNull();
    expect(mediaFromQueryReply(reply({ __typename: "XDTGraphNew", display_url: cdn("a.jpg") }))).toBeNull();
    expect(
      mediaFromQueryReply(reply({ __typename: "XDTGraphImage", display_url: "http://x.example/a.jpg" })),
    ).toBeNull();
  });
});

describe("describeInstagramReply", () => {
  it.each([
    [401, { message: "Please wait a few minutes before you try again.", status: "fail" }, true, /rate-limiting/],
    [429, "", true, /rate-limiting/],
    [200, reply(null), true, /rate-limiting/],
    [404, "", false, /private or deleted/],
    [503, "", true, /Instagram is having trouble \(HTTP 503\)/],
    [
      200,
      reply({ __typename: "XDTGraphVideo", display_url: cdn("poster.jpg") }),
      false,
      /missing some of the post's files/,
    ],
  ])("HTTP %s is retryable: %s", (status, body, retryable, message) => {
    const described = describeInstagramReply(status, body);
    expect(described.retryable).toBe(retryable);
    expect(described.message).toMatch(message);
  });
});
