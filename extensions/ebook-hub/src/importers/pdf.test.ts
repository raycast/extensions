import { describe, expect, it } from "vitest";

import { PDF_QUALITY_WARNING, fixedPageRanges, importPdf, linesToMarkdown, removeRunningBoilerplate } from "./pdf";

/** Build a minimal uncompressed PDF with one Helvetica text line per entry. */
function buildPdf(pages: string[][]): Uint8Array {
  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 4 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  pages.forEach((lines, index) => {
    const pageId = pageIds[index];
    const text = lines.map((line) => `(${line.replace(/[\\()]/g, (char) => `\\${char}`)}) Tj T*`).join(" ");
    const stream = `BT /F1 12 Tf 14 TL 72 720 Td ${text} ET`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let output = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = output.length;
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = output.length;
  const entries = offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n${entries}`;
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(output);
}

const NAMES = ["Alpha", "Bravo", "Charlie"];

describe("importPdf", () => {
  it("extracts text, drops running headers and page numbers, and warns about quality", async () => {
    const pdf = buildPdf(
      NAMES.map((name, index) => [
        "Ebook Hub Sample",
        `${name} opens the page with a long line of sample text for testing`,
        `${name} continues with another long line of sample text here`,
        `and ${name} ends with a short line.`,
        `${name} closing words.`,
        String(index + 1),
      ]),
    );

    const book = await importPdf(pdf, "sample");

    expect(book.title).toBe("sample");
    expect(book.warnings).toEqual([PDF_QUALITY_WARNING]);
    expect(book.chapters.map((chapter) => chapter.title)).toEqual(["Pages 1–3"]);
    const markdown = book.chapters[0].markdown;
    expect(markdown).toContain("Alpha opens the page");
    expect(markdown).toContain("Charlie closing words.");
    expect(markdown).not.toContain("Ebook Hub Sample");
  });

  it("rejects PDFs without a text layer", async () => {
    await expect(importPdf(buildPdf([[], []]), "scan")).rejects.toThrow(/no text layer/);
  });

  it("rejects files that are not PDFs", async () => {
    await expect(importPdf(new TextEncoder().encode("hello"), "x")).rejects.toThrow(/not a readable PDF/);
  });
});

describe("PDF text cleanup", () => {
  it("removes repeated edge lines and page numbers", () => {
    const pages = NAMES.map((name, index) => ["Header", `${name} one`, `${name} two`, `${name} three`, `${index + 1}`]);
    expect(removeRunningBoilerplate(pages)).toEqual(
      NAMES.map((name) => [`${name} one`, `${name} two`, `${name} three`]),
    );
  });

  it("joins hyphenated lines and breaks paragraphs after short sentence-final lines", () => {
    const lines = [
      "This paragraph has a long first line that keeps go-",
      "ing on the next line and has plenty of words in it",
      "and finally it stops.",
      "# A second paragraph begins with a long enough line here",
    ];
    expect(linesToMarkdown(lines)).toBe(
      "This paragraph has a long first line that keeps going on the next line and has plenty of words in it and finally it stops.\n\n" +
        "\\# A second paragraph begins with a long enough line here",
    );
  });

  it("splits pages into fixed ranges when there is no outline", () => {
    expect(fixedPageRanges(21, 10)).toEqual([
      { title: "Pages 1–10", start: 0, end: 10 },
      { title: "Pages 11–20", start: 10, end: 20 },
      { title: "Page 21", start: 20, end: 21 },
    ]);
  });
});
