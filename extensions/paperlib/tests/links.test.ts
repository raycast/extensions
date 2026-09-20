import { describe, expect, it } from "vitest";

import { missingWebLinkMessage, paperWebUrl, resolveLocalPdf } from "../src/lib/links";
import type { PaperEntity } from "../src/lib/types";
import { DEMO_PAPERS } from "../src/lib/demo-library";

function paper(overrides: Partial<PaperEntity> = {}): PaperEntity {
  return {
    ...DEMO_PAPERS[0],
    ...overrides,
  };
}

describe("paperWebUrl", () => {
  it("prefers DOI, then arXiv, then a recorded http URL", () => {
    expect(paperWebUrl(paper())).toBe("https://doi.org/10.48550/arXiv.1706.03762");
    expect(paperWebUrl(paper({ doi: "" }))).toBe("https://arxiv.org/abs/1706.03762");
    expect(
      paperWebUrl(
        paper({
          doi: "",
          arxiv: "",
          mainURL: "https://papers.nips.cc/paper/2017/file/attention.pdf",
        }),
      ),
    ).toBe("https://papers.nips.cc/paper/2017/file/attention.pdf");
  });

  it("returns null when the record has no web identifier", () => {
    const blank = paper({ doi: "", arxiv: "", mainURL: "Vaswani2017.pdf" });
    expect(paperWebUrl(blank)).toBeNull();
    expect(missingWebLinkMessage(blank)).toContain("No web link");
  });
});

describe("resolveLocalPdf", () => {
  it("errors when mainURL is missing", () => {
    const resolved = resolveLocalPdf(paper({ mainURL: "" }));
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.error).toMatch(/no local PDF path/i);
    }
  });

  it("does not treat a web URL as a local PDF", () => {
    const resolved = resolveLocalPdf(paper({ mainURL: "https://arxiv.org/pdf/1706.03762" }));
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.error).toMatch(/remote file/i);
    }
  });

  it("joins a relative Paperlib mainURL with the library folder", () => {
    const resolved = resolveLocalPdf(paper({ mainURL: "Vaswani2017-AttentionIsAllYouNeed.pdf" }), "/Users/me/Documents/paperlib");
    expect(resolved).toEqual({
      ok: true,
      path: "/Users/me/Documents/paperlib/Vaswani2017-AttentionIsAllYouNeed.pdf",
    });
  });

  it("uses file:// and absolute paths from the record as-is", () => {
    expect(resolveLocalPdf(paper({ mainURL: "file:///Users/me/Documents/paperlib/paper.pdf" }))).toEqual({
      ok: true,
      path: "/Users/me/Documents/paperlib/paper.pdf",
    });
    expect(resolveLocalPdf(paper({ mainURL: "/Volumes/lib/paper.pdf" }))).toEqual({
      ok: true,
      path: "/Volumes/lib/paper.pdf",
    });
  });

  it("errors on a relative path when no library folder is known", () => {
    const resolved = resolveLocalPdf(paper({ mainURL: "paper.pdf" }));
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.error).toMatch(/library folder/i);
    }
  });
});
