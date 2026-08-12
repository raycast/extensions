import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFromTemplate, sanitizeName, targetPathFor } from "../templates";

describe("sanitizeName", () => {
  it("strips path separators and leading dots", () => {
    expect(sanitizeName("My/Project")).toBe("My-Project");
    expect(sanitizeName("a\\b:c")).toBe("a-b-c");
    expect(sanitizeName("..hidden")).toBe("hidden");
  });
  it("collapses whitespace and trims", () => {
    expect(sanitizeName("  cool   name  ")).toBe("cool name");
  });
});

describe("targetPathFor", () => {
  it("builds a flat target path", () => {
    expect(targetPathFor({ destination: "/Work", name: "Promo", ext: "psd", wrapInFolder: false })).toEqual({
      dir: "/Work",
      file: "/Work/Promo.psd",
    });
  });
  it("wraps in a folder named after the project", () => {
    expect(targetPathFor({ destination: "/Work", name: "Promo", ext: "prproj", wrapInFolder: true })).toEqual({
      dir: "/Work/Promo",
      file: "/Work/Promo/Promo.prproj",
    });
  });
  it("sanitizes the name into both folder and file", () => {
    const plan = targetPathFor({
      destination: "/Work",
      name: "A/B Cut",
      ext: "ai",
      wrapInFolder: true,
    });
    expect(plan).toEqual({ dir: "/Work/A-B Cut", file: "/Work/A-B Cut/A-B Cut.ai" });
  });
  it("throws when the name has no usable characters", () => {
    expect(() => targetPathFor({ destination: "/W", name: "...", ext: "psd", wrapInFolder: false })).toThrow();
    expect(() => targetPathFor({ destination: "/W", name: "   ", ext: "ai", wrapInFolder: true })).toThrow();
    expect(() => targetPathFor({ destination: "/W", name: ". .", ext: "psd", wrapInFolder: false })).toThrow();
    expect(() => targetPathFor({ destination: "/W", name: ". .", ext: "psd", wrapInFolder: true })).toThrow();
    expect(() => targetPathFor({ destination: "/W", name: ". . .", ext: "psd", wrapInFolder: false })).toThrow();
    expect(() => targetPathFor({ destination: "/W", name: ". . .", ext: "psd", wrapInFolder: true })).toThrow();
  });
});

describe("createFromTemplate", () => {
  it("copies the template and refuses to overwrite", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cff-"));
    try {
      const tpl = join(dir, "tpl.psd");
      await writeFile(tpl, "TEMPLATE");
      const plan = { dir, file: join(dir, "out.psd") };
      await createFromTemplate(tpl, plan);
      expect(await readFile(plan.file, "utf8")).toBe("TEMPLATE");
      await expect(createFromTemplate(tpl, plan)).rejects.toThrow(/already exists/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
