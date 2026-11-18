import { describe, expect, it } from "vitest";
import { facetsOf } from "./convention";
import { nameWithoutHost } from "./search-view";

describe("host-prefixed titles", () => {
  it("displays the name without its host", () => {
    expect(nameWithoutHost("claude.ai · Usage")).toBe("Usage");
    expect(nameWithoutHost("booking.eurostar.com · Book")).toBe("Book");
    expect(nameWithoutHost("poeditor.com · Project")).toBe("Project");
  });

  it("keeps a bare host as the whole display name", () => {
    expect(nameWithoutHost("reddit.com")).toBe("reddit.com");
  });

  it("leaves a non-host leading segment alone", () => {
    expect(nameWithoutHost("Chat · Mozilla")).toBe("Chat · Mozilla");
  });

  it("still parses brand, environment and category around the prefixed title", () => {
    expect(facetsOf({ title: "claude.ai · Usage", packageName: "Claude · @work · #dev" })).toEqual({
      environment: "work",
      name: "claude.ai · Usage",
      brand: "Claude",
      category: "dev",
    });
  });
});
