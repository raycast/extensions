import { describe, expect, it } from "vitest";

import type { Membership, Space } from "../src/api/types";
import {
  buildSpaceItem,
  chatUserNameForPerson,
  namesFromMembers,
  personInfo,
  personNameForChatUser,
  spaceKind,
  usersNeedingLookup,
} from "../src/helpers/dm-names";

const ME = "users/1";
const dm: Space = { name: "spaces/DM", spaceType: "DIRECT_MESSAGE", displayName: "" };
const member = (name: string, extra: Partial<Membership["member"]> = {}): Membership => ({
  name: `spaces/DM/members/${name}`,
  member: { name, type: "HUMAN", ...extra },
});

describe("buildSpaceItem", () => {
  it("uses the space's own display name", () => {
    const item = buildSpaceItem({ name: "spaces/S", spaceType: "SPACE", displayName: " Data Platform " }, [], ME);
    expect(item).toMatchObject({ title: "Data Platform", kind: "space" });
  });

  it("names a DM after the other member's Chat display name", () => {
    const item = buildSpaceItem(
      dm,
      [member(ME, { displayName: "Me" }), member("users/2", { displayName: "Sara Khan", email: "sara@x.com" })],
      ME,
    );
    expect(item).toMatchObject({ title: "Sara Khan", kind: "dm", email: "sara@x.com", userName: "users/2" });
  });

  it("falls back to the People API profile when Chat hides the name", () => {
    const item = buildSpaceItem(dm, [member(ME), member("users/2", { isAnonymous: true })], ME, {
      "users/2": { name: "Ali Raza", email: "ali@x.com", photoUrl: "https://photo" },
    });
    expect(item).toMatchObject({ title: "Ali Raza", email: "ali@x.com", avatarUrl: "https://photo" });
  });

  it("falls back to the email, then to a placeholder", () => {
    expect(buildSpaceItem(dm, [member("users/3", { email: "x@y.com" })], ME).title).toBe("x@y.com");
    expect(buildSpaceItem(dm, [member("users/3")], ME).title).toBe("Unknown person");
    expect(buildSpaceItem(dm, undefined, ME).title).toBe("Direct Message");
    expect(buildSpaceItem(dm, [member(ME)], ME).title).toBe("You");
  });

  it("ignores bots when naming a DM", () => {
    const item = buildSpaceItem(
      dm,
      [member("users/bot", { type: "BOT", displayName: "Bot" }), member("users/2", { displayName: "Hina" })],
      ME,
    );
    expect(item.title).toBe("Hina");
  });

  it("names unnamed group chats after their members", () => {
    const group: Space = { name: "spaces/G", spaceType: "GROUP_CHAT" };
    const members = ["A", "B", "C", "D"].map((n, i) => member(`users/${i + 10}`, { displayName: n }));
    expect(buildSpaceItem(group, [member(ME), ...members], ME)).toMatchObject({ title: "A, B, C +1", kind: "group" });
    expect(buildSpaceItem(group, [], ME).title).toBe("Group Chat");
  });
});

describe("usersNeedingLookup", () => {
  it("lists other members without a known name", () => {
    const members = [
      member(ME),
      member("users/2", { displayName: "Known" }),
      member("users/3"),
      member("users/4", { isAnonymous: true, displayName: "x" }),
      member("users/5"),
    ];
    expect(usersNeedingLookup(members, ME, { "users/5": { name: "Cached" } })).toEqual(["users/3", "users/4"]);
  });
});

describe("id mapping and people", () => {
  it("maps between Chat users and People resource names", () => {
    expect(chatUserNameForPerson("people/123")).toBe("users/123");
    expect(personNameForChatUser("users/123")).toBe("people/123");
    expect(personNameForChatUser("users/a@b.com")).toBeUndefined();
  });

  it("reads primary name, email and a non-default photo", () => {
    expect(
      personInfo({
        resourceName: "people/1",
        names: [{ displayName: "Other" }, { displayName: "Primary", metadata: { primary: true } }],
        emailAddresses: [{ value: "p@x.com" }],
        photos: [{ url: "default", default: true }, { url: "real" }],
      }),
    ).toEqual({ name: "Primary", email: "p@x.com", photoUrl: "real" });
  });

  it("builds a name map from members and people", () => {
    expect(spaceKind({ spaceType: "GROUP_CHAT" })).toBe("group");
    expect(
      namesFromMembers([member("users/2", { displayName: "Sara" }), member("users/3")], {
        "users/3": { name: "Ali" },
        "users/9": { name: "Zed" },
      }),
    ).toEqual({
      "users/2": "Sara",
      "users/3": "Ali",
      "users/9": "Zed",
    });
  });
});
