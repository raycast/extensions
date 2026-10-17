import { beforeEach, describe, expect, it, vi } from "vitest";

const unpdf = vi.hoisted(() => ({ getDocumentProxy: vi.fn(), extractText: vi.fn(), getMeta: vi.fn() }));
vi.mock("unpdf", () => unpdf);

import { importPdf } from "./pdf";

interface OutlineItem {
  title: string;
  dest: unknown;
}

type Outline = OutlineItem[] | null | Error;

function fakePdf(outline: Outline = null, destinations: Record<string, unknown> = {}) {
  const destroy = vi.fn(() => Promise.resolve());
  unpdf.getDocumentProxy.mockResolvedValue({
    getOutline: () => (outline instanceof Error ? Promise.reject(outline) : Promise.resolve(outline)),
    getDestination: (name: string) => {
      const value = destinations[name];
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value ?? null);
    },
    // Fake references map `num` 10 + n to page n.
    getPageIndex: (ref: { num: number }) => Promise.resolve(ref.num - 10),
    loadingTask: { destroy },
  });
  return { destroy };
}

const page = (label: string) => `${label} has plenty of visible characters for a text layer.`;
const data = new Uint8Array([1, 2, 3]);

beforeEach(() => {
  unpdf.extractText.mockResolvedValue({ totalPages: 4, text: ["One", "Two", "Three", "Four"].map(page) });
  unpdf.getMeta.mockResolvedValue({ info: { Title: " Mocked Title ", Author: "Ann and Bob & Cy" }, metadata: {} });
});

describe("importPdf with outlines", () => {
  it("splits chapters from resolvable outline entries", async () => {
    const { destroy } = fakePdf(
      [
        { title: "Intro", dest: [{ num: 11, gen: 0 }, { name: "Fit" }] },
        { title: "Named", dest: "chapter-two" },
        { title: "   ", dest: [3] },
        { title: "Duplicate", dest: [3] },
        { title: "Broken", dest: "explode" },
        { title: "Unknown", dest: "missing" },
        { title: "No destination", dest: null },
        { title: "Fraction", dest: [1.5] },
        { title: "Object", dest: [{ name: "XYZ" }] },
        { title: "Far away", dest: [99] },
      ],
      { "chapter-two": [2, { name: "Fit" }], explode: new Error("bad destination") },
    );

    const book = await importPdf(data, "fallback");

    expect(book.title).toBe("Mocked Title");
    expect(book.authors).toEqual(["Ann", "Bob", "Cy"]);
    expect(book.chapters.map((chapter) => chapter.title)).toEqual(["Front Matter", "Intro", "Named", "Section 3"]);
    expect(book.chapters[1].markdown).toContain("Two has plenty");
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it.each<[string, Outline]>([
    ["no outline", null],
    ["an unreadable outline", new Error("corrupt outline")],
    ["a single resolvable entry", [{ title: "Only", dest: [0] }]],
  ])("uses fixed page ranges for %s", async (_label, outline) => {
    fakePdf(outline);
    expect((await importPdf(data, "fallback")).chapters.map((chapter) => chapter.title)).toEqual(["Pages 1–4"]);
  });
});

describe("importPdf metadata and failures", () => {
  it("falls back to the file name when metadata is missing or unreadable", async () => {
    fakePdf();
    unpdf.getMeta.mockResolvedValueOnce({ info: { Title: 5, Author: "  " }, metadata: {} });
    expect(await importPdf(data, "fallback")).toMatchObject({ title: "fallback", authors: [] });

    unpdf.getMeta.mockRejectedValueOnce(new Error("bad XMP"));
    expect(await importPdf(data, "fallback")).toMatchObject({ title: "fallback", authors: [] });
  });

  it("accepts merged text output", async () => {
    fakePdf();
    unpdf.extractText.mockResolvedValueOnce({ totalPages: 1, text: page("Solo") });
    expect((await importPdf(data, "x")).chapters[0].markdown).toContain("Solo has plenty");
  });

  it("explains password-protected and unreadable PDFs", async () => {
    unpdf.getDocumentProxy.mockRejectedValueOnce(
      Object.assign(new Error("Need password"), { name: "PasswordException" }),
    );
    await expect(importPdf(data, "x")).rejects.toThrow("Password-protected PDFs are not supported.");

    unpdf.getDocumentProxy.mockRejectedValueOnce("not even an error");
    await expect(importPdf(data, "x")).rejects.toThrow("This file is not a readable PDF.");
  });

  it("wraps unexpected extraction failures and still releases the document", async () => {
    const { destroy } = fakePdf();
    unpdf.extractText.mockRejectedValueOnce(new Error("worker crashed"));

    await expect(importPdf(data, "x")).rejects.toThrow("Could not extract text from this PDF.");
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
