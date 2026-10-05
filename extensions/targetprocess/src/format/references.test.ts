import { describe, expect, it } from "vitest";

import { Entity } from "../api/types";
import { idAndTitle, markdownLink, typeAndId } from "./references";

function entity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 145322,
    name: "Login page rejects valid passwords",
    type: "Bug",
    state: null,
    projectName: null,
    modifyDate: null,
    ...overrides,
  };
}

describe("idAndTitle", () => {
  it("reads as a commit subject", () => {
    expect(idAndTitle(entity())).toBe("145322: Login page rejects valid passwords");
  });

  it("leaves an awkward title alone rather than mangling it", () => {
    expect(idAndTitle(entity({ name: "Café: 50% of users can't log in" }))).toBe(
      "145322: Café: 50% of users can't log in",
    );
  });
});

describe("markdownLink", () => {
  it("links the id and title", () => {
    expect(markdownLink(entity(), "https://acme.tpondemand.com/entity/145322")).toBe(
      "[145322: Login page rejects valid passwords](https://acme.tpondemand.com/entity/145322)",
    );
  });
});

describe("typeAndId", () => {
  it("names the type in prose", () => {
    expect(typeAndId(entity())).toBe("Bug 145322");
  });

  it("splits camel-case type names", () => {
    expect(typeAndId(entity({ type: "UserStory" }))).toBe("User Story 145322");
    expect(typeAndId(entity({ type: "PortfolioEpic" }))).toBe("Portfolio Epic 145322");
  });
});
