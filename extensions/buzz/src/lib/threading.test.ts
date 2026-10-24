import { describe, it, expect } from "vitest";
import { getThreadReference, isBroadcastReply, isThreadReply } from "./threading";

const ROOT = "a".repeat(64);
const PARENT = "b".repeat(64);

describe("getThreadReference", () => {
  it("returns nulls when the event has no tags", () => {
    expect(getThreadReference([])).toEqual({ parentId: null, rootId: null });
  });

  it("returns nulls when the event has no e tags", () => {
    expect(getThreadReference([["h", "chan"]])).toEqual({ parentId: null, rootId: null });
  });

  it("returns nulls when e tags carry no reply marker", () => {
    expect(getThreadReference([["e", ROOT]])).toEqual({ parentId: null, rootId: null });
  });

  it("reads the parent from the reply-marked tag", () => {
    const tags = [
      ["e", ROOT, "", "root"],
      ["e", PARENT, "", "reply"],
    ];
    expect(getThreadReference(tags)).toEqual({ parentId: PARENT, rootId: ROOT });
  });

  it("falls back to the parent when there is no root-marked tag", () => {
    expect(getThreadReference([["e", PARENT, "", "reply"]])).toEqual({ parentId: PARENT, rootId: PARENT });
  });

  it("uses the last reply-marked tag when several exist", () => {
    const tags = [
      ["e", ROOT, "", "reply"],
      ["e", PARENT, "", "reply"],
    ];
    expect(getThreadReference(tags).parentId).toBe(PARENT);
  });

  it("ignores an e tag whose id is not a string", () => {
    const tags = [["e"], ["e", PARENT, "", "reply"]] as string[][];
    expect(getThreadReference(tags).parentId).toBe(PARENT);
  });

  it("handles a reply tag whose id is an empty string", () => {
    const tags = [["e", "", "", "reply"]];
    expect(getThreadReference(tags)).toEqual({ parentId: "", rootId: "" });
  });

  it("uses the first root-marked tag when several exist", () => {
    const OTHER_ROOT = "c".repeat(64);
    const tags = [
      ["e", ROOT, "", "root"],
      ["e", OTHER_ROOT, "", "root"],
      ["e", PARENT, "", "reply"],
    ];
    expect(getThreadReference(tags).rootId).toBe(ROOT);
    expect(getThreadReference(tags).parentId).toBe(PARENT);
  });
});

describe("isBroadcastReply", () => {
  it("is true only for the broadcast 1 tag", () => {
    expect(isBroadcastReply([["broadcast", "1"]])).toBe(true);
    expect(isBroadcastReply([["broadcast", "0"]])).toBe(false);
    expect(isBroadcastReply([["h", "chan"]])).toBe(false);
  });
});

describe("isThreadReply", () => {
  it("is true for a plain reply", () => {
    expect(isThreadReply([["e", PARENT, "", "reply"]])).toBe(true);
  });

  it("is false for a root message", () => {
    expect(isThreadReply([["h", "chan"]])).toBe(false);
  });

  it("is false for a broadcast reply, which Buzz keeps in the channel feed", () => {
    const tags = [
      ["e", PARENT, "", "reply"],
      ["broadcast", "1"],
    ];
    expect(isThreadReply(tags)).toBe(false);
  });
});
