import { describe, expect, it } from "vitest";

import type { Membership } from "../src/api/types";
import {
  ALL_USERS,
  applyMentions,
  matchMember,
  mentionMembers,
  renderMentions,
  resolveMentionInputs,
  sanitizeMentionValues,
  type MentionMember,
} from "../src/helpers/mentions";

const sara = { user: "users/1", name: "Sara Khan" };
const ali = { user: "users/2", name: "Ali Raza" };
const all = { user: ALL_USERS, name: "all" };

describe("applyMentions", () => {
  it("replaces @Full Name or @FirstName, case-insensitive, at the first occurrence", () => {
    expect(applyMentions("@sara khan please review", [sara])).toBe("<users/1> please review");
    expect(applyMentions("Hey @Sara, and @Sara again", [sara])).toBe("Hey <users/1>, and @Sara again");
  });

  it("prepends people not named in the text, in pick order", () => {
    expect(applyMentions("build is green", [ali, sara])).toBe("<users/2> <users/1> build is green");
    expect(applyMentions("thanks @Ali", [sara, ali])).toBe("<users/1> thanks <users/2>");
  });

  it("matches whole words only", () => {
    expect(applyMentions("@Sarah and sara@example.com", [sara])).toBe("<users/1> @Sarah and sara@example.com");
    expect(applyMentions("ping @Sara_ops", [sara])).toBe("<users/1> ping @Sara_ops");
  });

  it("handles @all and @everyone", () => {
    expect(applyMentions("@everyone code freeze tonight", [all])).toBe("<users/all> code freeze tonight");
    expect(applyMentions("Heads up @ALL.", [all])).toBe("Heads up <users/all>.");
    expect(applyMentions("@allison is out", [all])).toBe("<users/all> @allison is out");
  });

  it("leaves inline code and code blocks alone", () => {
    expect(applyMentions("run `@Sara` then ask @Sara", [sara])).toBe("run `@Sara` then ask <users/1>");
    expect(applyMentions("```\n@all\n```", [all])).toBe("<users/all> ```\n@all\n```");
  });

  it("doesn't mention someone twice", () => {
    expect(applyMentions("<users/1> see this @Sara", [sara])).toBe("<users/1> see this @Sara");
    expect(applyMentions("hi", [sara, sara])).toBe("<users/1> hi");
    // A token inside code isn't a mention, so one is still added.
    expect(applyMentions("`<users/1>`", [sara])).toBe("<users/1> `<users/1>`");
  });

  it("prefers full names over first names shared by two people", () => {
    const saraLee = { user: "users/3", name: "Sara Lee" };
    expect(applyMentions("@Sara and @Sara Lee", [sara, saraLee])).toBe("<users/1> @Sara and <users/3>");
    expect(applyMentions("@Sara Lee and @Sara Khan", [sara, saraLee])).toBe("<users/3> and <users/1>");
  });

  it("escapes regex characters in names", () => {
    const odd = { user: "users/4", name: "J.R. (Ops) Smith+" };
    expect(applyMentions("cc @j.r. (ops) smith+ now", [odd])).toBe("cc <users/4> now");
    expect(applyMentions("cc @JxR now", [odd])).toBe("<users/4> cc @JxR now");
  });

  it("matches non-Latin names and leaves links alone", () => {
    const jose = { user: "users/5", name: "José Núñez" };
    expect(applyMentions("gracias @josé", [jose])).toBe("gracias <users/5>");
    expect(applyMentions("<https://x.com|@Sara> hi", [sara])).toBe("<users/1> <https://x.com|@Sara> hi");
  });

  it("returns the text unchanged with no targets, and only tokens for empty text", () => {
    expect(applyMentions("hello", [])).toBe("hello");
    expect(applyMentions("", [sara])).toBe("<users/1>");
  });
});

describe("renderMentions", () => {
  it("shows tokens as @Name, @all for everyone", () => {
    expect(renderMentions("<users/1> <users/all> hi <users/9>", { "users/1": "Sara Khan" })).toBe(
      "@Sara Khan @all hi @9",
    );
  });

  it("leaves code untouched", () => {
    expect(renderMentions("`<users/1>` <users/1>", { "users/1": "Sara" })).toBe("`<users/1>` @Sara");
  });
});

const members: MentionMember[] = [
  { user: "users/1", name: "Sara Khan", email: "sara@example.com" },
  { user: "users/2", name: "Sara Lee", email: "slee@example.com" },
  { user: "users/3", name: "Ali Raza", email: "ali@example.com" },
  { user: "users/4", name: "Hina Khan" },
];

describe("matchMember", () => {
  it("finds a unique member by email, full name, first name or part of the name", () => {
    expect(matchMember("SARA@example.com", members)).toEqual({
      kind: "unique",
      target: { user: "users/1", name: "Sara Khan" },
    });
    expect(matchMember("sara lee", members)).toMatchObject({ kind: "unique", target: { user: "users/2" } });
    expect(matchMember("@Ali", members)).toMatchObject({ kind: "unique", target: { user: "users/3" } });
    expect(matchMember("raz", members)).toMatchObject({ kind: "unique", target: { user: "users/3" } });
    expect(matchMember("slee", members)).toMatchObject({ kind: "unique", target: { user: "users/2" } });
  });

  it("treats all and everyone as everyone", () => {
    expect(matchMember("everyone", members)).toEqual({ kind: "unique", target: { user: ALL_USERS, name: "all" } });
  });

  it("reports ambiguous and missing names", () => {
    const sara = matchMember("Sara", members);
    expect(sara.kind).toBe("ambiguous");
    expect(sara.kind === "ambiguous" && sara.candidates.map((m) => m.user)).toEqual(["users/1", "users/2"]);
    expect(matchMember("Khan", members).kind).toBe("ambiguous");
    expect(matchMember("Bilal", members)).toEqual({ kind: "none" });
    expect(matchMember("  ", members)).toEqual({ kind: "none" });
  });
});

describe("resolveMentionInputs", () => {
  it("resolves names without duplicates", () => {
    expect(resolveMentionInputs(["ali", "Ali Raza", "all"], members, "Data")).toEqual([
      { user: "users/3", name: "Ali Raza" },
      { user: ALL_USERS, name: "all" },
    ]);
  });

  it("throws listing candidates on ambiguity", () => {
    expect(() => resolveMentionInputs(["Sara"], members, "Data")).toThrow(
      '"Sara" matches 2 people in "Data": Sara Khan <sara@example.com>; Sara Lee <slee@example.com>',
    );
  });

  it("throws listing members when nobody matches", () => {
    expect(() => resolveMentionInputs(["Bilal"], members, "Data")).toThrow(
      /No one in "Data" matches "Bilal"\. Members: Sara Khan <sara@example.com>;.*Hina Khan\. Use "all"/,
    );
  });
});

describe("mentionMembers", () => {
  it("lists other humans with names from Chat or People, sorted, without me or bots", () => {
    const memberships: Membership[] = [
      { name: "spaces/A/members/1", member: { name: "users/1", type: "HUMAN" } },
      { name: "spaces/A/members/2", member: { name: "users/2", displayName: "Ali Raza", type: "HUMAN" } },
      { name: "spaces/A/members/3", member: { name: "users/me1", displayName: "Me", type: "HUMAN" } },
      { name: "spaces/A/members/4", member: { name: "users/bot", displayName: "Bot", type: "BOT" } },
      { name: "spaces/A/members/5", member: { name: "users/5", type: "HUMAN" } },
    ];
    const people = { "users/1": { name: "Sara Khan", email: "sara@example.com", photoUrl: "https://p/1" } };
    expect(mentionMembers(memberships, "users/me1", people)).toEqual([
      { user: "users/2", name: "Ali Raza", email: undefined, avatarUrl: undefined },
      { user: "users/1", name: "Sara Khan", email: "sara@example.com", avatarUrl: "https://p/1" },
      { user: "users/5", name: "Unknown person", email: undefined, avatarUrl: undefined },
    ]);
  });
});

describe("sanitizeMentionValues", () => {
  it("keeps well-formed user names from drafts", () => {
    expect(sanitizeMentionValues(["users/1", "users/all", "users/1", "spaces/A", 3, "users/<x>"])).toEqual([
      "users/1",
      "users/all",
    ]);
    expect(sanitizeMentionValues(undefined)).toEqual([]);
    expect(sanitizeMentionValues("users/1")).toEqual([]);
  });
});
