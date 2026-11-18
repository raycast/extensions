import { describe, it, expect } from "vitest";
import type { User } from "@clerk/backend";
import { primaryEmail, fullName } from "./user";

function makeUser(overrides: Partial<User>): User {
  return {
    firstName: null,
    lastName: null,
    username: null,
    primaryEmailAddressId: null,
    emailAddresses: [],
    ...overrides,
  } as User;
}

function email(id: string, emailAddress: string) {
  return { id, emailAddress } as User["emailAddresses"][number];
}

describe("primaryEmail", () => {
  it("returns the email matching primaryEmailAddressId", () => {
    const user = makeUser({
      primaryEmailAddressId: "e2",
      emailAddresses: [email("e1", "first@example.com"), email("e2", "primary@example.com")],
    });
    expect(primaryEmail(user)).toBe("primary@example.com");
  });

  it("falls back to the first email when the primary id has no match", () => {
    const user = makeUser({
      primaryEmailAddressId: "missing",
      emailAddresses: [email("e1", "first@example.com")],
    });
    expect(primaryEmail(user)).toBe("first@example.com");
  });

  it("falls back to the first email when primaryEmailAddressId is null", () => {
    const user = makeUser({
      primaryEmailAddressId: null,
      emailAddresses: [email("e1", "first@example.com")],
    });
    expect(primaryEmail(user)).toBe("first@example.com");
  });

  it("returns the em dash when there are no emails", () => {
    expect(primaryEmail(makeUser({ emailAddresses: [] }))).toBe("—");
  });
});

describe("fullName", () => {
  it("joins first and last name", () => {
    expect(fullName(makeUser({ firstName: "Ada", lastName: "Lovelace" }))).toBe("Ada Lovelace");
  });

  it("uses first name alone when last name is missing", () => {
    expect(fullName(makeUser({ firstName: "Ada" }))).toBe("Ada");
  });

  it("uses last name alone when first name is missing", () => {
    expect(fullName(makeUser({ lastName: "Lovelace" }))).toBe("Lovelace");
  });

  it("falls back to username when no name is set", () => {
    expect(fullName(makeUser({ username: "ada" }))).toBe("ada");
  });

  it("falls back to primary email when no name or username is set", () => {
    const user = makeUser({
      primaryEmailAddressId: "e1",
      emailAddresses: [email("e1", "ada@example.com")],
    });
    expect(fullName(user)).toBe("ada@example.com");
  });
});
