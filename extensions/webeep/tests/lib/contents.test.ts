import { describe, expect, it } from "vitest";
import fixture from "../fixtures/course-contents.json";
import { classifyLink, collectFiles, collectLinks, RawSection, toSections } from "../../src/lib/contents";

const sections = toSections(fixture as RawSection[], 42, "en");

describe("toSections", () => {
  it("drops sections and modules the user cannot see", () => {
    expect(sections.map((s) => s.name)).toEqual(["Introduction", "Recordings"]);
    expect(sections[1].modules.map((m) => m.name)).toEqual([
      "recording archive",
      "link to virtual classroom",
      "Textbook",
    ]);
  });

  it("resolves the language of section and module names", () => {
    expect(toSections(fixture as RawSection[], 42, "it")[0].modules[0].name).toBe("informazioni generali");
  });

  it("exposes the external URL of url modules", () => {
    expect(sections[1].modules[0].externalUrl).toContain("aunicalogin.polimi.it");
  });
});

describe("collectFiles", () => {
  const files = collectFiles(sections);

  it("lists folder files with metadata but skips page HTML", () => {
    expect(files.map((f) => f.name)).toEqual(["Course Calendar.pdf", "lab-setup.zip"]);
    expect(files[0]).toMatchObject({
      id: "2001:/Course Calendar.pdf",
      size: 300074,
      mimetype: "application/pdf",
      moduleName: "general info",
      sectionName: "Introduction",
      courseId: 42,
    });
    expect(files[0].modified?.getTime()).toBe(1789200000 * 1000);
    expect(files[1].id).toBe("2001:/lab/lab-setup.zip");
  });
});

describe("collectLinks / classifyLink", () => {
  it("classifies recording archives and virtual classrooms", () => {
    const links = collectLinks(sections, 42);
    expect(links.map((l) => [l.name, l.kind])).toEqual([
      ["recording archive", "recording"],
      ["link to virtual classroom", "classroom"],
    ]);
  });

  it("recognises recordings by name or URL and classrooms by URL", () => {
    expect(classifyLink("Lezioni registrate", "https://example.com")).toBe("recording");
    expect(classifyLink("Link", "https://example.com/panopto/")).toBe("recording");
    expect(classifyLink("Meeting", "https://zoom.us/j/1")).toBe("classroom");
    expect(classifyLink("Slides", "https://example.com/slides")).toBe("link");
  });
});
