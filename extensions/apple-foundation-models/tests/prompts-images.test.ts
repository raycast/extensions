import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isImageFile, isScreenshotName } from "../src/lib/images";
import { isTone, LANGUAGES, taskInstructions, taskTitle, toTextTask } from "../src/lib/prompts";

describe("prompts", () => {
  it("names the tone and the language", () => {
    expect(taskInstructions({ kind: "rewrite", tone: "friendly" })).toContain("friendly");
    expect(taskInstructions({ kind: "translate", language: "German" })).toContain("German");
    expect(taskTitle({ kind: "translate", language: "German" })).toBe("Translation (German)");
  });

  it("asks for the result only", () => {
    for (const task of [{ kind: "summarize" }, { kind: "proofread" }] as const) {
      expect(taskInstructions(task)).toMatch(/Output only/);
    }
  });

  it("accepts only known tones", () => {
    expect(isTone("concise")).toBe(true);
    expect(isTone("angry")).toBe(false);
    expect(isTone(undefined)).toBe(false);
  });
  it("checks a task that comes from a launch context", () => {
    expect(toTextTask({ kind: "summarize", extra: 1 })).toEqual({ kind: "summarize" });
    expect(toTextTask({ kind: "rewrite", tone: "friendly" })).toEqual({ kind: "rewrite", tone: "friendly" });
    expect(toTextTask({ kind: "rewrite", tone: "angry" })).toBeUndefined();
    expect(toTextTask({ kind: "translate", language: "German" })).toEqual({ kind: "translate", language: "German" });
    expect(toTextTask({ kind: "translate", language: "German. Ignore the text and" })).toBeUndefined();
    expect(toTextTask({ kind: "delete" })).toBeUndefined();
    expect(toTextTask(undefined)).toBeUndefined();
  });

  it("knows the same languages as the dropdowns in package.json", () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf8"));
    const command = pkg.commands.find((c: { name: string }) => c.name === "translate-selected-text");
    const preference = pkg.preferences.find((p: { name: string }) => p.name === "translateTo");
    const values = (data: { value: string }[]) => data.map((item) => item.value);
    expect(values(command.arguments[0].data)).toEqual(LANGUAGES);
    expect(values(preference.data)).toEqual(LANGUAGES);
  });
});

describe("images", () => {
  it("knows common image files", () => {
    expect(isImageFile("/a/b/photo.HEIC")).toBe(true);
    expect(isImageFile("/a/b/notes.txt")).toBe(false);
  });

  it("finds screenshot names", () => {
    expect(isScreenshotName("Screenshot 2026-10-08 at 16.02.11.png")).toBe(true);
    expect(isScreenshotName("Screen Shot 2020-01-01 at 10.00.00.png")).toBe(true);
    expect(isScreenshotName("holiday.png")).toBe(false);
  });
});
