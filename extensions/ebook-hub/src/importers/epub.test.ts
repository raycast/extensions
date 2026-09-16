import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { hasContentEncryption, importEpub } from "./epub";
import { ImportError } from "./types";

const container = (fullPath = "OEBPS/content.opf") => `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="${fullPath}" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

const OPF = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Sample Book</dc:title>
    <dc:creator>Jane Doe</dc:creator>
    <dc:language>en-GB</dc:language>
  </metadata>
  <manifest>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="c1" href="text/chapter%201.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="text/c2.xhtml" media-type="application/xhtml+xml"/>
    <item id="img" href="cover.png" media-type="image/png"/>
  </manifest>
  <spine><itemref idref="cover"/><itemref idref="c1"/><itemref idref="c2"/></spine>
</package>`;

const xhtml = (title: string, body: string) =>
  `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title>` +
  `<script>track()</script></head><body>${body}</body></html>`;

async function buildEpub(overrides: Record<string, string | null> = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  const files: Record<string, string | null> = {
    mimetype: "application/epub+zip",
    "META-INF/container.xml": container(),
    "OEBPS/content.opf": OPF,
    "OEBPS/cover.xhtml": xhtml("Cover", '<img src="cover.png"/>'),
    "OEBPS/text/chapter 1.xhtml": xhtml(
      "Ch1",
      "<h1>The Beginning</h1><p>It was a <em>dark</em> night.</p><img src='https://tracker.example/p.gif'/>",
    ),
    "OEBPS/text/c2.xhtml": xhtml("Second Doc Title", "<p>No heading here.</p>"),
    ...overrides,
  };
  Object.entries(files).forEach(([path, content]) => {
    if (content !== null) {
      zip.file(path, content);
    }
  });
  return zip.generateAsync({ type: "uint8array" });
}

describe("importEpub", () => {
  it("reads metadata and spine chapters, skipping image-only pages", async () => {
    const book = await importEpub(await buildEpub(), "fallback");

    expect(book).toMatchObject({ title: "Sample Book", authors: ["Jane Doe"], language: "en-GB", warnings: [] });
    expect(book.chapters.map((chapter) => chapter.title)).toEqual(["The Beginning", "Second Doc Title"]);
    expect(book.chapters[0].markdown).toContain("dark");
    expect(book.chapters[0].markdown).not.toContain("tracker");
    expect(book.chapters[0].markdown).not.toContain("track()");
  });

  it("handles root packages, odd spine entries, and sparse metadata", async () => {
    const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title id="main">1984</dc:title></metadata>
  <manifest>
    <item id="orphan" media-type="application/xhtml+xml"/>
    <item id="bad" href="ch%ZZ1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="notes" href="notes.xhtml" media-type="application/xhtml+xml"/>
    <item id="gone" href="gone.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ncx"/><itemref idref="notes" linear="no"/><itemref idref="ghost"/><itemref/>
    <itemref idref="gone"/><itemref idref="bad"/>
  </spine>
</package>`;
    const epub = await buildEpub({
      "META-INF/container.xml": container("content.opf"),
      "OEBPS/content.opf": null,
      "content.opf": opf,
      "ch%ZZ1.xhtml": "<p>Bare paragraph without a document title.</p>",
    });

    const book = await importEpub(epub, "fallback");

    expect(book).toMatchObject({ title: "1984", authors: [], language: null });
    expect(book.chapters).toEqual([{ title: "Section 1", markdown: "Bare paragraph without a document title." }]);
    expect(book.warnings).toEqual([
      'Skipped a spine entry with unknown id "ghost".',
      'Skipped a spine entry with unknown id "".',
      "Missing chapter file gone.xhtml.",
    ]);
  });

  it("uses the file name when the package has no title", async () => {
    const untitled = OPF.replace("<dc:title>Sample Book</dc:title>", "");
    expect((await importEpub(await buildEpub({ "OEBPS/content.opf": untitled }), "fallback")).title).toBe("fallback");
  });

  it("imports EPUBs whose fonts are only obfuscated", async () => {
    const encryption = '<encryption><EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/></encryption>';
    const book = await importEpub(await buildEpub({ "META-INF/encryption.xml": encryption }), "x");
    expect(book.chapters).toHaveLength(2);
  });

  it.each([
    [
      "DRM-protected",
      {
        "META-INF/encryption.xml":
          '<encryption><EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/></encryption>',
      },
      /DRM-protected/,
    ],
    ["missing container", { "META-INF/container.xml": null }, /missing META-INF\/container.xml/],
    ["missing package", { "META-INF/container.xml": container("nowhere.opf") }, /no readable package document/],
    [
      "rootfile without path",
      { "META-INF/container.xml": container().replace(/full-path="[^"]+"/, "") },
      /no readable package document/,
    ],
    [
      "no readable chapters",
      {
        "OEBPS/text/chapter 1.xhtml": xhtml("Empty", "<img src='a.png'/>"),
        "OEBPS/text/c2.xhtml": xhtml("Empty", ""),
      },
      /No readable chapters/,
    ],
  ])("rejects %s EPUBs", async (_label, overrides, message) => {
    await expect(importEpub(await buildEpub(overrides), "x")).rejects.toThrow(message);
  });

  it("rejects files that are not EPUB archives", async () => {
    await expect(importEpub(new TextEncoder().encode("not a zip"), "x")).rejects.toBeInstanceOf(ImportError);
  });
});

describe("hasContentEncryption", () => {
  it("treats font obfuscation as unencrypted content", () => {
    expect(hasContentEncryption('<EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/>')).toBe(false);
    expect(hasContentEncryption('<EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/>')).toBe(
      true,
    );
  });
});
