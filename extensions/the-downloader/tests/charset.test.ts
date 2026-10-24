import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { charsetOf, decodeHtml } from "../src/lib/charset";

const czech = fs.readFileSync(path.join(__dirname, "fixtures/links/cz-article-1250.html"));

describe("charsetOf", () => {
  it("prefers the Content-Type header over the page's own meta tag", () => {
    expect(charsetOf("text/html; charset=ISO-8859-2", Buffer.from('<meta charset="utf-8">'))).toBe("iso-8859-2");
    expect(charsetOf('text/html; charset="windows-1250"', Buffer.from(""))).toBe("windows-1250");
  });

  it("lets a byte-order mark win over everything", () => {
    expect(charsetOf("text/html; charset=windows-1250", Buffer.from([0xef, 0xbb, 0xbf, 0x3c]))).toBe("utf-8");
    expect(charsetOf(undefined, Buffer.from([0xff, 0xfe, 0x3c, 0x00]))).toBe("utf-16le");
  });

  it("reads <meta charset> and <meta http-equiv> when the header has none", () => {
    expect(charsetOf(undefined, Buffer.from('<head><meta charset="iso-8859-2">'))).toBe("iso-8859-2");
    expect(charsetOf("text/html", Buffer.from("<META CHARSET=windows-1250>"))).toBe("windows-1250");
    expect(charsetOf("text/html", czech)).toBe("windows-1250");
  });

  it("falls back to UTF-8", () => {
    expect(charsetOf(undefined, Buffer.from("<p>no charset</p>"))).toBe("utf-8");
  });
});

describe("decodeHtml", () => {
  it("reads a windows-1250 Czech article whose charset is only in <meta http-equiv>", () => {
    const html = decodeHtml(czech, "text/html");
    expect(html).toContain("Příliš žluťoučký kůň úpěl ďábelské ódy.");
    expect(html).toContain("Jiřina Šťastná");
  });

  it("decodes ISO-8859-2", () => {
    expect(decodeHtml(Buffer.from([0xa9, 0xe8, 0xf8, 0xbe]), "text/html; charset=iso-8859-2")).toBe("Ščřž");
  });

  it("uses UTF-8 for a label it doesn't know, and strips the BOM", () => {
    expect(decodeHtml(Buffer.from("<p>čau</p>"), "text/html; charset=x-made-up")).toBe("<p>čau</p>");
    expect(decodeHtml(Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from("<p>ok</p>")]))).toBe("<p>ok</p>");
  });
});
