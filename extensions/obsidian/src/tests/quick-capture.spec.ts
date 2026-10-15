import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { CaptureValues, saveQuickCapture } from "../api/quickCapture.service";

vi.mock("@raycast/api");

describe("Quick Capture", () => {
  let root: string;
  let vault: string;
  let note: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "quick-capture-test-"));
    vault = path.join(root, "vault");
    await fs.mkdir(vault);
    note = path.join(vault, "capture.md");
    await fs.writeFile(note, "Existing content");
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it.each([
    ["daily", "dailyNotePath", "- Milk"],
    ["todo", "todoNotePath", "- [ ] Milk"],
    ["shopping", "shoppingNotePath", "- Milk"],
  ] as const)("appends %s to the configured route without requiring other routes", async (type, key, entry) => {
    await saveQuickCapture(vault, { type, text: " Milk " }, { [key]: "capture.md" });
    expect(await fs.readFile(note, "utf8")).toBe(`Existing content\n${entry}`);
  });

  it.each(["daily", "todo", "shopping"] as const)("rejects an unconfigured %s route", async (type) => {
    await expect(saveQuickCapture(vault, { type, text: "Milk" }, {})).rejects.toThrow("path first");
    expect(await fs.readFile(note, "utf8")).toBe("Existing content");
  });

  it("rejects whitespace without changing the note", async () => {
    await expect(
      saveQuickCapture(vault, { type: "todo", text: " \n " }, { todoNotePath: "capture.md" })
    ).rejects.toThrow("Enter text");
    expect(await fs.readFile(note, "utf8")).toBe("Existing content");
  });

  it.each(["daily", "todo", "shopping"] as const)("keeps multiple lines in one %s item", async (type) => {
    const preferences = { dailyNotePath: "capture.md", todoNotePath: "capture.md", shoppingNotePath: "capture.md" };
    await saveQuickCapture(vault, { type, text: "First\r\nSecond" }, preferences);
    const prefix = type === "todo" ? "- [ ] " : "- ";
    expect(await fs.readFile(note, "utf8")).toBe(`Existing content\n${prefix}First\n  Second`);
  });

  it("expands date templates in the target path and content", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 9, 10, 12));
      const daily = path.join(vault, "2026-10-10.md");
      await fs.writeFile(daily, "Today");
      await saveQuickCapture(vault, { type: "daily", text: "On {date}" }, { dailyNotePath: "{date}.md" });
      expect(await fs.readFile(daily, "utf8")).toBe("Today\n- On 2026-10-10");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not create a missing note", async () => {
    await expect(
      saveQuickCapture(vault, { type: "daily", text: "Hello" }, { dailyNotePath: "missing.md" })
    ).rejects.toThrow();
    await expect(fs.stat(path.join(vault, "missing.md"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects non-Markdown files and preserves their contents", async () => {
    const target = path.join(vault, "settings.json");
    await fs.writeFile(target, '{"example":true}');
    await expect(
      saveQuickCapture(vault, { type: "daily", text: "Hello" }, { dailyNotePath: "settings.json" })
    ).rejects.toThrow("Markdown");
    expect(await fs.readFile(target, "utf8")).toBe('{"example":true}');
  });

  it("rejects a directory named with the .md extension", async () => {
    await fs.mkdir(path.join(vault, "folder.md"));
    await expect(
      saveQuickCapture(vault, { type: "daily", text: "Hello" }, { dailyNotePath: "folder.md" })
    ).rejects.toThrow("regular Markdown");
  });

  it("rejects absolute paths", async () => {
    await expect(saveQuickCapture(vault, { type: "daily", text: "Hello" }, { dailyNotePath: note })).rejects.toThrow(
      "relative"
    );
    expect(await fs.readFile(note, "utf8")).toBe("Existing content");
  });

  it("rejects paths outside the vault", async () => {
    const outside = path.join(root, "outside.md");
    await fs.writeFile(outside, "Outside");
    await expect(
      saveQuickCapture(vault, { type: "daily", text: "Hello" }, { dailyNotePath: "../outside.md" })
    ).rejects.toThrow("inside");
    expect(await fs.readFile(outside, "utf8")).toBe("Outside");
  });

  it("rejects symbolic links to a note outside the vault", async () => {
    const outside = path.join(root, "outside.md");
    await fs.writeFile(outside, "Outside");
    await fs.symlink(outside, path.join(vault, "link.md"));
    await expect(
      saveQuickCapture(vault, { type: "daily", text: "Hello" }, { dailyNotePath: "link.md" })
    ).rejects.toThrow("inside");
    expect(await fs.readFile(outside, "utf8")).toBe("Outside");
  });

  it("rejects a Markdown-named symbolic link to a non-Markdown file", async () => {
    const target = path.join(vault, "settings.json");
    await fs.writeFile(target, "{}");
    await fs.symlink(target, path.join(vault, "link.md"));
    await expect(
      saveQuickCapture(vault, { type: "daily", text: "Hello" }, { dailyNotePath: "link.md" })
    ).rejects.toThrow("regular Markdown");
    expect(await fs.readFile(target, "utf8")).toBe("{}");
  });

  it("preserves both captures when saves run together", async () => {
    const values: CaptureValues[] = [
      { type: "shopping", text: "Milk" },
      { type: "shopping", text: "Bread" },
    ];
    await Promise.all(values.map((value) => saveQuickCapture(vault, value, { shoppingNotePath: "capture.md" })));
    const saved = await fs.readFile(note, "utf8");
    expect(["Existing content\n- Milk\n- Bread", "Existing content\n- Bread\n- Milk"]).toContain(saved);
  });
});
