import { describe, expect, it } from "vitest";
import { ALL_EXTENSIONS, defForPath, extOf, isDesignFile } from "../extensions";

describe("extOf", () => {
  it("returns lowercase extension without dot", () => {
    expect(extOf("/a/b/Promo.PSD")).toBe("psd");
    expect(extOf("project.prproj")).toBe("prproj");
  });
  it("returns empty for no extension or dotfiles", () => {
    expect(extOf("/a/b/README")).toBe("");
    expect(extOf("/a/b/.psd")).toBe("");
    expect(extOf("noext")).toBe("");
  });
  it("uses the last dot", () => {
    expect(extOf("/a/my.cool.file.ai")).toBe("ai");
  });
});

describe("isDesignFile / defForPath", () => {
  it("matches the five supported types", () => {
    for (const ext of ["prproj", "psd", "psb", "ai", "aep"]) {
      expect(isDesignFile(`/x/file.${ext}`)).toBe(true);
    }
    expect(ALL_EXTENSIONS).toEqual(["prproj", "psd", "psb", "ai", "aep"]);
  });
  it("rejects unrelated extensions", () => {
    expect(isDesignFile("/x/movie.mp4")).toBe(false);
    expect(isDesignFile("/x/notes.md")).toBe(false);
  });
  it("maps extensions to the right app", () => {
    expect(defForPath("/x/a.prproj")?.app).toBe("premiere");
    expect(defForPath("/x/a.PSB")?.app).toBe("photoshop");
    expect(defForPath("/x/a.ai")?.app).toBe("illustrator");
    expect(defForPath("/x/a.aep")?.app).toBe("aftereffects");
    expect(defForPath("/x/a.txt")).toBeUndefined();
  });
});
