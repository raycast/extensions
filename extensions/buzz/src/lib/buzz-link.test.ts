import { describe, it, expect } from "vitest";
import { buildMessageLink, buildChannelLink, ANCHORLESS_MESSAGE_ID } from "./buzz-link";

const CHANNEL = "23e68814-4859-4f93-966e-ba0a6366f3c5";
const MESSAGE = "a".repeat(64);

describe("buildMessageLink", () => {
  it("builds the exact format Buzz's own clients build", () => {
    expect(buildMessageLink(CHANNEL, MESSAGE)).toBe(`buzz://message?channel=${CHANNEL}&id=${MESSAGE}`);
  });

  it("puts channel before id, matching the desktop builder", () => {
    const link = buildMessageLink(CHANNEL, MESSAGE);
    expect(link.indexOf("channel=")).toBeLessThan(link.indexOf("id="));
  });

  it("percent-encodes a value that needs it", () => {
    expect(buildMessageLink("a b&c", MESSAGE)).toContain("channel=a+b%26c");
  });

  it("throws when the channel id is empty", () => {
    expect(() => buildMessageLink("", MESSAGE)).toThrow(/channelId is required/);
  });

  it("throws when the message id is empty", () => {
    expect(() => buildMessageLink(CHANNEL, "")).toThrow(/messageId is required/);
  });
});

describe("ANCHORLESS_MESSAGE_ID", () => {
  it("is a syntactically valid event id that cannot exist", () => {
    expect(ANCHORLESS_MESSAGE_ID).toMatch(/^0{64}$/);
  });
});

describe("buildChannelLink", () => {
  it("links to the channel using the anchorless sentinel", () => {
    expect(buildChannelLink(CHANNEL)).toBe(`buzz://message?channel=${CHANNEL}&id=${ANCHORLESS_MESSAGE_ID}`);
  });

  it("is exactly buildMessageLink with the sentinel", () => {
    expect(buildChannelLink(CHANNEL)).toBe(buildMessageLink(CHANNEL, ANCHORLESS_MESSAGE_ID));
  });

  it("throws when the channel id is empty", () => {
    expect(() => buildChannelLink("")).toThrow(/channelId is required/);
  });
});
