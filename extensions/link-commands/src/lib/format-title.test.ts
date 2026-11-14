import { describe, expect, it } from "vitest";
import { formatTitle } from "./format-title";

describe("formatTitle", () => {
  it("leaves the name alone when the preference is off", () => {
    expect(formatTitle({ name: "Usage", target: "https://claude.ai/", enabled: false })).toBe("Usage");
  });

  it("prefixes the host when enabled", () => {
    expect(formatTitle({ name: "Usage", target: "https://claude.ai/", enabled: true })).toBe("claude.ai · Usage");
    expect(formatTitle({ name: "Project", target: "https://poeditor.com/", enabled: true })).toBe(
      "poeditor.com · Project",
    );
  });

  it("keeps the full subdomain host", () => {
    expect(formatTitle({ name: "Book", target: "https://booking.eurostar.com/", enabled: true })).toBe(
      "booking.eurostar.com · Book",
    );
  });

  it("strips a leading www from the host", () => {
    expect(formatTitle({ name: "Watch Later", target: "https://www.youtube.com/feed", enabled: true })).toBe(
      "youtube.com · Watch Later",
    );
  });

  it("is just the host when the name is empty", () => {
    expect(formatTitle({ name: "   ", target: "https://reddit.com/", enabled: true })).toBe("reddit.com");
  });

  it("is just the host when the name is the brand or the host", () => {
    expect(formatTitle({ name: "Reddit", target: "https://reddit.com/", enabled: true, brand: "Reddit" })).toBe(
      "reddit.com",
    );
    expect(formatTitle({ name: "reddit.com", target: "https://reddit.com/", enabled: true })).toBe("reddit.com");
    expect(formatTitle({ name: "REDDIT.COM", target: "https://reddit.com/", enabled: true })).toBe("reddit.com");
  });

  it("never double-prefixes", () => {
    expect(formatTitle({ name: "claude.ai · Usage", target: "https://claude.ai/", enabled: true })).toBe(
      "claude.ai · Usage",
    );
    expect(formatTitle({ name: "CLAUDE.AI · Usage", target: "https://claude.ai/", enabled: true })).toBe(
      "CLAUDE.AI · Usage",
    );
  });

  it("leaves non-web targets untouched", () => {
    expect(formatTitle({ name: "Open Downloads", target: "~/Downloads", enabled: true })).toBe("Open Downloads");
    expect(formatTitle({ name: "Notes", target: "obsidian://open?vault=notes", enabled: true })).toBe("Notes");
  });

  it("leaves a surface router untouched", () => {
    expect(
      formatTitle({
        name: "Open Linear",
        target: "https://linear.app/acme",
        enabled: true,
        desktopApplication: "/Applications/Linear.app",
      }),
    ).toBe("Open Linear");
  });
});
