import { describe, expect, it } from "vitest";
import { matchMember } from "../src/helpers/members";

const members = [
  { id: "u1", displayName: "alex", name: "Alex Kim", email: "alex.kim@example.com" },
  { id: "u2", displayName: "alex2", name: "Alex Kim", email: "alex.k@example.com" },
  { id: "u3", displayName: "sam", name: "Sam Lee", email: "sam@example.com" },
  { id: "u4", displayName: "samantha", name: "Samantha Ray", email: "samantha@example.com" },
];

describe("matchMember", () => {
  it("matches ids and emails first", () => {
    expect(matchMember(members, "u2").id).toBe("u2");
    expect(matchMember(members, " ALEX.K@example.com ").id).toBe("u2");
  });

  it("matches a unique exact display name or full name", () => {
    expect(matchMember(members, "alex").id).toBe("u1");
    expect(matchMember(members, "Sam Lee").id).toBe("u3");
    // "sam" is exact for u3 even though it is also part of "samantha".
    expect(matchMember(members, "SAM").id).toBe("u3");
  });

  it("throws with the candidates when an exact name is shared", () => {
    expect(() => matchMember(members, "alex kim")).toThrow(
      '"alex kim" matches several members: alex (alex.kim@example.com), alex2 (alex.k@example.com). Be more specific.',
    );
  });

  it("matches a unique partial name and throws for several", () => {
    expect(matchMember(members, "ray").id).toBe("u4");
    expect(() => matchMember(members, "kim")).toThrow(/matches several members/);
  });

  it("throws when nothing matches", () => {
    expect(() => matchMember(members, "nobody")).toThrow('Member "nobody" not found in this project.');
  });
});
