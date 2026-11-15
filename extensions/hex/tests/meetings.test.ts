import { describe, expect, it } from "vitest";
import { transcriptBody } from "../src/lib/meetings";

const HEADER = [
  "# Roadmap sync",
  "",
  "- Meeting: 1794624139403-1335",
  "- Started: 2026-11-13T16:42:19-10:00",
  "- Duration: 00:48",
  "- App: Zoom",
  "- Status: complete · final transcript",
  "",
];

describe("transcriptBody", () => {
  it("drops Hex's header fields and keeps the title and transcript", () => {
    const markdown = [
      ...HEADER,
      "## Transcript",
      "",
      "[00:02] You: Let's start.",
    ].join("\n");
    expect(transcriptBody(markdown)).toBe(
      [
        "# Roadmap sync",
        "",
        "",
        "## Transcript",
        "",
        "[00:02] You: Let's start.",
      ].join("\n"),
    );
  });

  it("keeps header-like lines inside the transcript", () => {
    const markdown = [
      ...HEADER,
      "## Transcript",
      "- Status: blocked on review",
    ].join("\n");
    expect(transcriptBody(markdown)).toContain("- Status: blocked on review");
  });

  it("keeps lines it doesn't recognize in the header", () => {
    const markdown = [
      ...HEADER,
      "warning: microphone only",
      "## Transcript",
    ].join("\n");
    expect(transcriptBody(markdown)).toContain("warning: microphone only");
  });

  it("returns markdown without a header unchanged", () => {
    const markdown = "# Notes\n\nNo transcript yet.";
    expect(transcriptBody(markdown)).toBe(markdown);
  });
});
