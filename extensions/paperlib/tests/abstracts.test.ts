import { describe, expect, it } from "vitest";

import { resolveAbstract } from "../src/lib/abstracts";
import { DEMO_PAPERS } from "../src/lib/demo-library";

describe("abstracts", () => {
  it("prefers the stored abstract over a network lookup", async () => {
    const calls: string[] = [];
    const abstract = await resolveAbstract(DEMO_PAPERS[0], {
      enabled: true,
      fetcher: {
        async fetch(url) {
          calls.push(url);
          return { ok: true, status: 200, text: async () => "" };
        },
      },
    });

    expect(abstract).toContain("Transformer architecture");
    expect(calls).toHaveLength(0);
  });

  it("fills a missing abstract from Crossref JATS", async () => {
    const abstract = await resolveAbstract(
      {
        ...DEMO_PAPERS[0],
        abstract: "",
        note: "",
        arxiv: "",
      },
      {
        enabled: true,
        fetcher: {
          async fetch(url) {
            if (url.includes("crossref")) {
              return {
                ok: true,
                status: 200,
                text: async () =>
                  JSON.stringify({
                    message: {
                      abstract: "<jats:p>Remote abstract from Crossref.</jats:p>",
                    },
                  }),
              };
            }
            throw new Error(`unexpected ${url}`);
          },
        },
      },
    );

    expect(abstract).toBe("Remote abstract from Crossref.");
  });

  it("falls back to arXiv Atom summaries", async () => {
    const abstract = await resolveAbstract(
      {
        ...DEMO_PAPERS[0],
        doi: "",
        abstract: "",
        note: "",
        arxiv: "1706.03762",
      },
      {
        enabled: true,
        fetcher: {
          async fetch(url) {
            expect(url).toContain("arxiv.org");
            return {
              ok: true,
              status: 200,
              text: async () => `<feed><entry><summary>From arXiv.</summary></entry></feed>`,
            };
          },
        },
      },
    );

    expect(abstract).toBe("From arXiv.");
  });
});
