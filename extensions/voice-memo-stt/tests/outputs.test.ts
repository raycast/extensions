import { describe, expect, test } from "bun:test";
import { asMarkdown, preferredOutput } from "../src/outputs";
import type { Recording } from "../src/types";

function recording(outputs: Record<string, string>): Recording {
  return {
    id: 1,
    title: "Meeting",
    path: "a.m4a",
    audio_path: "/audio/a.m4a",
    duration: 60,
    duration_formatted: "1m00s",
    date: "2026-04-15T11:33:26+09:00",
    transcribed: Object.keys(outputs).length > 0,
    chars: 0,
    outputs,
  };
}

describe("preferredOutput", () => {
  test("prefers plain text over every other format", () => {
    const got = preferredOutput(recording({ json: "/out/a.json", txt: "/out/a.txt", md: "/out/a.md" }));
    expect(got).toEqual({ format: "txt", path: "/out/a.txt" });
  });

  test("falls back to markdown when there is no plain text", () => {
    const got = preferredOutput(recording({ json: "/out/a.json", md: "/out/a.md" }));
    expect(got).toEqual({ format: "md", path: "/out/a.md" });
  });

  test("uses whatever exists rather than showing nothing", () => {
    const got = preferredOutput(recording({ csv: "/out/a.csv" }));
    expect(got).toEqual({ format: "csv", path: "/out/a.csv" });
  });

  test("reports nothing for an untranscribed recording", () => {
    expect(preferredOutput(recording({}))).toBeUndefined();
  });
});

describe("asMarkdown", () => {
  test("keeps each line of a transcript on its own line", () => {
    // Without hard breaks, markdown would run the two speakers together.
    expect(asMarkdown("Speaker 1: hi\nSpeaker 2: hello", "txt")).toBe("Speaker 1: hi  \nSpeaker 2: hello");
  });

  test("leaves markdown output untouched", () => {
    const md = "# Title\n\n- one\n- two";
    expect(asMarkdown(md, "md")).toBe(md);
  });

  test("handles an empty transcription", () => {
    expect(asMarkdown("", "txt")).toBe("");
  });
});
