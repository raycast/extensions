import { describe, expect, it } from "vitest";

import type { Person, SpaceItem } from "../src/api/types";
import {
  decodeRecipient,
  encodeRecipient,
  findSpacesByTitle,
  isEmail,
  matchesSearch,
  parseRecipient,
  parseThread,
  peopleNotInDms,
  spaceNameOf,
  typedEmail,
} from "../src/helpers/recipient";

describe("parseRecipient", () => {
  it("recognises emails, lowercased", () => {
    expect(parseRecipient(" Sara.Khan@Example.com ")).toEqual({ kind: "email", email: "sara.khan@example.com" });
    expect(parseRecipient("mailto:ali@example.com")).toEqual({ kind: "email", email: "ali@example.com" });
  });

  it("recognises space and user resource names", () => {
    expect(parseRecipient("spaces/AAAAbc-_1")).toEqual({ kind: "space", name: "spaces/AAAAbc-_1" });
    expect(parseRecipient("users/1234567890")).toEqual({ kind: "user", name: "users/1234567890" });
  });

  it("extracts spaces from Chat and Gmail links", () => {
    expect(parseRecipient("https://chat.google.com/room/AAAA1234?cls=7")).toEqual({
      kind: "space",
      name: "spaces/AAAA1234",
    });
    expect(parseRecipient("https://chat.google.com/dm/DDDD")).toEqual({ kind: "space", name: "spaces/DDDD" });
    expect(parseRecipient("https://mail.google.com/chat/u/0/#chat/space/SSSS")).toEqual({
      kind: "space",
      name: "spaces/SSSS",
    });
  });

  it("treats anything else as a title, without a leading # or @", () => {
    expect(parseRecipient("#Data Platform")).toEqual({ kind: "title", title: "Data Platform" });
    expect(parseRecipient("@Sara Khan")).toEqual({ kind: "title", title: "Sara Khan" });
    expect(parseRecipient("sara@")).toEqual({ kind: "title", title: "sara@" });
  });

  it("rejects empty input", () => {
    expect(() => parseRecipient("   ")).toThrow("Recipient is empty");
  });
});

describe("isEmail", () => {
  it("accepts addresses and rejects other text", () => {
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("a@b")).toBe(false);
    expect(isEmail("spaces/AAAA")).toBe(false);
    expect(isEmail("two words@x.com")).toBe(false);
  });
});

describe("parseThread", () => {
  it("accepts thread names, message names and Chat links", () => {
    expect(parseThread("spaces/AAAA/threads/TTTT")).toBe("spaces/AAAA/threads/TTTT");
    expect(parseThread("spaces/AAAA/messages/TTTT.MMMM")).toBe("spaces/AAAA/threads/TTTT");
    expect(parseThread("https://chat.google.com/room/AAAA/TTTT/MMMM?cls=10")).toBe("spaces/AAAA/threads/TTTT");
  });

  it("returns undefined for empty input and throws for garbage", () => {
    expect(parseThread(undefined)).toBeUndefined();
    expect(parseThread("  ")).toBeUndefined();
    expect(() => parseThread("not a thread")).toThrow(/Thread must be/);
  });
});

describe("findSpacesByTitle", () => {
  const items: SpaceItem[] = [
    { space: { name: "spaces/1" }, title: "Data Platform", kind: "space" },
    { space: { name: "spaces/2" }, title: "Sara Khan", kind: "dm", email: "sara@example.com" },
    { space: { name: "spaces/3" }, title: "Data  Platform", kind: "space" },
  ];

  it("matches titles exactly, ignoring case and extra spaces", () => {
    expect(findSpacesByTitle(items, "data platform").map((i) => i.space.name)).toEqual(["spaces/1", "spaces/3"]);
    expect(findSpacesByTitle(items, "Data")).toEqual([]);
  });

  it("matches DM emails", () => {
    expect(findSpacesByTitle(items, "SARA@example.com").map((i) => i.space.name)).toEqual(["spaces/2"]);
  });
});

describe("spaceNameOf", () => {
  it("returns the space part of a resource name", () => {
    expect(spaceNameOf("spaces/AAAA/messages/B.C")).toBe("spaces/AAAA");
    expect(spaceNameOf("spaces/AAAA")).toBe("spaces/AAAA");
  });
});

describe("recipient values", () => {
  it("encodes the kind in the value and decodes it back", () => {
    expect(encodeRecipient({ kind: "space", name: "spaces/AAA" })).toBe("space:spaces/AAA");
    expect(encodeRecipient({ kind: "person", email: " Sara@Example.com " })).toBe("person:sara@example.com");
    expect(decodeRecipient("space:spaces/AAA")).toEqual({ kind: "space", name: "spaces/AAA" });
    expect(decodeRecipient("person:Sara@example.com")).toEqual({ kind: "person", email: "sara@example.com" });
  });

  it("accepts bare space names stored by older versions", () => {
    expect(decodeRecipient("spaces/AAA")).toEqual({ kind: "space", name: "spaces/AAA" });
  });

  it("returns undefined for empty, unknown or malformed values", () => {
    expect(decodeRecipient("")).toBeUndefined();
    expect(decodeRecipient(undefined)).toBeUndefined();
    expect(decodeRecipient("person:not-an-email")).toBeUndefined();
    expect(decodeRecipient("space:spaces/AAA/messages/B")).toBeUndefined();
    expect(decodeRecipient("sara@example.com")).toBeUndefined();
  });
});

describe("matchesSearch", () => {
  const dm = { title: "Sara Khan", email: "sara@example.com" };
  it("matches titles and DM emails case-insensitively, everything when empty", () => {
    expect(matchesSearch(dm, "sara k")).toBe(true);
    expect(matchesSearch(dm, "EXAMPLE.com")).toBe(true);
    expect(matchesSearch(dm, "ali")).toBe(false);
    expect(matchesSearch(dm, "  ")).toBe(true);
  });
});

describe("peopleNotInDms", () => {
  const person = (id: string, email: string): Person => ({
    resourceName: `people/${id}`,
    names: [{ displayName: id }],
    emailAddresses: [{ value: email }],
  });
  it("drops people who already have a listed DM, by email or user id", () => {
    const people = [person("1", "Sara@example.com"), person("2", "ali@example.com"), person("3", "hina@example.com")];
    const dms = [{ email: "sara@example.com" }, { userName: "users/2" }];
    expect(peopleNotInDms(people, dms).map((p) => p.resourceName)).toEqual(["people/3"]);
  });
});

describe("typedEmail", () => {
  it("offers a typed email that no listed option has", () => {
    expect(typedEmail(" New.Person@Example.com ", ["sara@example.com"])).toBe("new.person@example.com");
    expect(typedEmail("mailto:x@y.co", [])).toBe("x@y.co");
  });

  it("skips non-emails and emails already listed", () => {
    expect(typedEmail("sara", [])).toBeUndefined();
    expect(typedEmail("sara@", [])).toBeUndefined();
    expect(typedEmail("SARA@example.com", ["sara@example.com", undefined])).toBeUndefined();
  });
});

describe("links", async () => {
  const { messageUrl, spaceUrl } = await import("../src/helpers/links");

  it("prefers spaceUri and falls back to chat.google.com", () => {
    expect(spaceUrl({ name: "spaces/AAAA", spaceUri: "https://chat.google.com/room/AAAA?cls=11" })).toBe(
      "https://chat.google.com/room/AAAA?cls=11",
    );
    expect(spaceUrl({ name: "spaces/DDDD", spaceType: "DIRECT_MESSAGE" })).toBe("https://chat.google.com/dm/DDDD");
  });

  it("links to a message by thread and message id", () => {
    const space = { name: "spaces/AAAA", spaceUri: "https://chat.google.com/room/AAAA?cls=11" };
    expect(
      messageUrl(space, { name: "spaces/AAAA/messages/TTTT.MMMM", thread: { name: "spaces/AAAA/threads/TTTT" } }),
    ).toBe("https://chat.google.com/room/AAAA/TTTT/MMMM");
    expect(messageUrl(space, { name: "spaces/AAAA/messages/TTTT" })).toBe(
      "https://chat.google.com/room/AAAA/TTTT/TTTT",
    );
  });
});
