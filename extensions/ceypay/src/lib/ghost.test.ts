import { Parser } from "commonmark";
import { describe, expect, it } from "vitest";
import { gateImages, postToMarkdown } from "./ghost";
import type { BlogPost } from "./types";

/**
 * The blog renders remote content, so an image URL decides which host Raycast
 * contacts. These cover the syntaxes an image can reach the document in — not
 * just the `![alt](url)` one — because each of them ends in a request.
 */

const TRUSTED = "https://blog.ceypay.io/content/images/shot.png";
const UNTRUSTED = "https://127.0.0.1.nip.io/image.png";

/** What Raycast's renderer will fetch: every image destination it resolves. */
function destinations(markdown: string): string[] {
  const walker = new Parser().parse(markdown).walker();
  const found: string[] = [];
  for (let event = walker.next(); event; event = walker.next()) {
    if (event.entering && event.node.type === "image") found.push(event.node.destination ?? "");
  }
  return found;
}

/**
 * Everything a renderer could be asked to fetch, in whichever syntax. Raw HTML
 * counts alongside the resolved image destinations: a tag names its own source,
 * so whether it fetches anything is the renderer's decision rather than ours.
 */
function fetchable(markdown: string): string[] {
  const walker = new Parser().parse(markdown).walker();
  const found: string[] = [];
  for (let event = walker.next(); event; event = walker.next()) {
    if (!event.entering) continue;
    const { type, destination, literal } = event.node;
    if (type === "image") found.push(destination ?? "");
    if (type === "html_inline" || type === "html_block") found.push(literal ?? "");
  }
  return found;
}

function post(fields: Partial<BlogPost> = {}): BlogPost {
  return {
    id: "1",
    title: "A post",
    slug: "a-post",
    excerpt: "",
    html: "",
    tags: [],
    authors: [],
    ...fields,
  };
}

describe("gateImages", () => {
  it("drops a reference image pointing at an untrusted host", () => {
    const markdown = `![image][remote]\n\n[remote]: ${UNTRUSTED}\n`;

    // The regression: the destination is not written where the image is, so a
    // pattern over the image alone never sees the host it resolves to.
    expect(destinations(markdown)).toEqual([UNTRUSTED]);
    expect(destinations(gateImages(markdown))).toEqual([]);
  });

  it.each([
    ["full reference", `![image][remote]\n\n[remote]: ${UNTRUSTED}\n`],
    ["collapsed reference", `![remote][]\n\n[remote]: ${UNTRUSTED}\n`],
    ["shortcut reference", `![remote]\n\n[remote]: ${UNTRUSTED}\n`],
    ["angle-bracketed definition", `![image][remote]\n\n[remote]: <${UNTRUSTED}>\n`],
    ["inline", `![image](${UNTRUSTED})`],
    ["inline, angle-bracketed", `![image](<${UNTRUSTED}>)`],
    ["inline, with a title", `![image](${UNTRUSTED} "A title")`],
    ["inline, brackets nested in the label", `![a[b]c](${UNTRUSTED})`],
    ["inline, http rather than https", "![image](http://blog.ceypay.io/shot.png)"],
    ["inline, trusted host sitting in the userinfo", "![image](https://blog.ceypay.io@127.0.0.1.nip.io/i.png)"],
  ])("leaves nothing to fetch for an untrusted %s image", (_syntax, markdown) => {
    expect(destinations(gateImages(markdown))).toEqual([]);
  });

  it.each([
    ["reference", `![shot][ok]\n\n[ok]: ${TRUSTED}\n`],
    ["inline", `![shot](${TRUSTED})`],
    ["inline, with sizing hints", `![shot](${TRUSTED}?raycast-width=520&raycast-height=300)`],
  ])("keeps a trusted %s image", (_syntax, markdown) => {
    expect(destinations(gateImages(markdown))).toHaveLength(1);
  });

  it("keeps the trusted image in a document that also carries an untrusted one", () => {
    const markdown = `![keep](${TRUSTED})\n\n![drop][remote]\n\n[remote]: ${UNTRUSTED}\n`;

    expect(destinations(gateImages(markdown))).toEqual([TRUSTED]);
  });

  it("leaves a definition inside a fenced block alone", () => {
    const markdown = `\`\`\`\n[remote]: ${UNTRUSTED}\n\`\`\`\n`;

    expect(gateImages(markdown)).toContain(UNTRUSTED);
    expect(destinations(gateImages(markdown))).toEqual([]);
  });

  /**
   * A post explaining Markdown carries image syntax it means to show rather than
   * render. The gate has to leave those samples intact even while it is removing
   * a real image elsewhere in the same document.
   */
  describe("code samples", () => {
    const sample = "![sample](https://example.invalid/image.png)";
    const blocked = `![bad](${UNTRUSTED})`;

    it("keeps a fenced sample while removing a real untrusted image", () => {
      const gated = gateImages(`${blocked}\n\n\`\`\`md\n${sample}\n\`\`\`\n`);

      expect(gated).toContain(sample);
      expect(destinations(gated)).toEqual([]);
    });

    it("keeps a sample in a tilde-fenced block", () => {
      expect(gateImages(`${blocked}\n\n~~~md\n${sample}\n~~~\n`)).toContain(sample);
    });

    it("keeps a sample inside an inline code span", () => {
      expect(gateImages(`${blocked}\n\nUse \`${sample}\` to embed one.`)).toContain(sample);
    });

    it("keeps a triple fence shown inside a longer one", () => {
      // Wrapping in a longer fence is how a post displays ``` itself, so the
      // inner run must not be read as the end of the block.
      const gated = gateImages(`${blocked}\n\n\`\`\`\`md\n\`\`\`\n${sample}\n\`\`\`\n\`\`\`\`\n`);

      expect(gated).toContain(sample);
      expect(destinations(gated)).toEqual([]);
    });

    it("keeps a triple tilde fence shown inside a longer one", () => {
      expect(gateImages(`${blocked}\n\n~~~~md\n~~~\n${sample}\n~~~\n~~~~\n`)).toContain(sample);
    });

    it("does not treat an inner fence carrying a language as the closing one", () => {
      const gated = gateImages(`${blocked}\n\n\`\`\`\`\n\`\`\`js\n${sample}\n\`\`\`\n\`\`\`\`\n`);

      expect(gated).toContain(sample);
    });

    it("keeps a definition inside a longer fence", () => {
      const markdown = `${blocked}\n\n\`\`\`\`md\n\`\`\`\n[remote]: ${UNTRUSTED}\n\`\`\`\n\`\`\`\`\n`;

      expect(gateImages(markdown)).toContain(`[remote]: ${UNTRUSTED}`);
    });

    it("keeps a sample while removing an image whose definition is split across lines", () => {
      // A label on one line and its destination on the next is still one
      // definition, and the image it feeds still resolves.
      const awkward = `![bad][remote]\n\n[remote]:\n  ${UNTRUSTED}\n\n\`\`\`md\n${sample}\n\`\`\`\n`;
      const gated = gateImages(awkward);

      expect(destinations(gated)).toEqual([]);
      expect(gated).toContain(sample);
      expect(gated).not.toContain("!\\[sample]");
    });
  });

  it("keeps prose that merely looks like an image", () => {
    expect(gateImages("Nothing here, just [a link](https://example.com) and text.")).toContain("a link");
  });
});

describe("postToMarkdown", () => {
  it("gates a reference image that arrives in the post body", () => {
    const markdown = postToMarkdown(post({ html: `<p>![image][remote]</p><p>[remote]: ${UNTRUSTED}</p>` }));

    expect(destinations(markdown)).toEqual([]);
  });

  it("gates a reference image that arrives in the title", () => {
    const markdown = postToMarkdown(post({ title: "![image][remote]", html: `<p>[remote]: ${UNTRUSTED}</p>` }));

    expect(destinations(markdown)).toEqual([]);
  });

  it("gates an untrusted feature image", () => {
    expect(destinations(postToMarkdown(post({ featureImage: UNTRUSTED })))).toEqual([]);
  });

  it("renders a trusted image from the post body", () => {
    const markdown = postToMarkdown(
      post({ html: `<figure><img src="${TRUSTED}" width="1040" height="600"></figure>` }),
    );

    expect(destinations(markdown)).toHaveLength(1);
    expect(markdown).toContain("raycast-width=520");
  });

  it("keeps the caption of an image it dropped", () => {
    const html = `<figure><img src="${UNTRUSTED}"><figcaption>The caption</figcaption></figure>`;

    expect(postToMarkdown(post({ html }))).toContain("The caption");
    expect(destinations(postToMarkdown(post({ html })))).toEqual([]);
  });

  it("gates an image that reaches the document as an escaped HTML tag", () => {
    // Ghost writes `&lt;img …&gt;` for a post quoting HTML at the reader. Tag
    // stripping runs before the entities are decoded, so it is a tag again by
    // the time the document is finished.
    const markdown = postToMarkdown(post({ html: `<p>&lt;img src="${UNTRUSTED}"&gt;</p>` }));

    expect(fetchable(markdown)).toEqual([]);
  });
});

/**
 * The gate reads the finished document back with the same parser the renderer
 * follows, so what counts as code — and what counts as an image — is the
 * parser's answer rather than a pattern's guess at it.
 */
describe("gateImages, read through the parser", () => {
  const sample = "![sample](https://example.invalid/image.png)";
  const blocked = `![bad](${UNTRUSTED})`;

  it("removes an image between backtick runs that do not pair", () => {
    // A run of one backtick and a run of two never close each other, so this is
    // no code span at all and CommonMark resolves the image between them.
    const markdown = `\`text ![image](${UNTRUSTED}) \`\``;

    expect(destinations(markdown)).toEqual([UNTRUSTED]);
    expect(destinations(gateImages(markdown))).toEqual([]);
  });

  it("keeps an indented code sample while removing a real untrusted image", () => {
    const gated = gateImages(`${blocked}\n\n    ${sample}\n`);

    expect(gated).toContain(sample);
    expect(destinations(gated)).toEqual([]);
  });

  it("keeps a code span sharing a paragraph with a removed image", () => {
    const gated = gateImages(`Use \`${sample}\`, not ${blocked}.`);

    expect(gated).toContain(sample);
    expect(destinations(gated)).toEqual([]);
  });

  it("does not fuse an escaped bang onto the link that follows it", () => {
    // `\!` is text and `[alt](…)` is a link. Written back out next to each
    // other unescaped they would spell an image the post never wrote.
    const markdown = `\\![alt](${UNTRUSTED}) ${blocked}`;

    expect(destinations(markdown)).toEqual([UNTRUSTED]);
    expect(destinations(gateImages(markdown))).toEqual([]);
  });

  it("leaves nothing to fetch in a raw HTML image tag", () => {
    expect(fetchable(gateImages(`<img src="${UNTRUSTED}">`))).toEqual([]);
  });

  it("leaves nothing to fetch in an inline HTML image tag", () => {
    expect(fetchable(gateImages(`Look: <img src="${UNTRUSTED}"> here.`))).toEqual([]);
  });

  it("leaves nothing to fetch in HTML that names no src at all", () => {
    // Raw HTML is turned back into text on sight rather than read for the
    // attributes that fetch, so a tag does not have to be recognised to be shut.
    expect(fetchable(gateImages(`<picture><source srcset="${UNTRUSTED} 2x"></picture>`))).toEqual([]);
  });

  it("removes an image wrapped in a link", () => {
    const gated = gateImages(`[![alt](${UNTRUSTED})](https://example.com)`);

    expect(destinations(gated)).toEqual([]);
    expect(gated).toContain("https://example.com");
  });

  it("removes an image in a table row and keeps the row", () => {
    // Tables are a GFM extension that CommonMark reads as an ordinary
    // paragraph, so the image is still an image node and still gets caught.
    const gated = gateImages(`| a | b |\n| - | - |\n| ![alt](${UNTRUSTED}) | keep |`);

    expect(destinations(gated)).toEqual([]);
    expect(gated).toContain("keep");
  });

  /**
   * Removing an image rewrites the block that held it, so the block has to come
   * back as what it was: the same words, in the same container, minus a picture.
   */
  describe("what the block keeps", () => {
    it("keeps the quote a removed image sat in", () => {
      const gated = gateImages(`> before ![bad](${UNTRUSTED}) after\n`);

      expect(destinations(gated)).toEqual([]);
      expect(gated).toContain("> before");
      expect(gated).toContain("after");
    });

    it("keeps the list item a removed image sat in", () => {
      const gated = gateImages(`- one\n- two ![bad](${UNTRUSTED})\n`);

      expect(destinations(gated)).toEqual([]);
      expect(gated).toContain("- one");
      expect(gated).toContain("- two");
    });

    it("keeps the heading a removed image sat in", () => {
      const gated = gateImages(`## Title ![bad](${UNTRUSTED})\n`);

      expect(destinations(gated)).toEqual([]);
      expect(gated).toContain("## Title");
    });

    it("keeps the emphasis and the links around a removed image", () => {
      const gated = gateImages(`**bold** [link](https://example.com) ![bad](${UNTRUSTED})`);

      expect(destinations(gated)).toEqual([]);
      expect(gated).toContain("**bold**");
      expect(gated).toContain("[link](https://example.com)");
    });

    it("keeps a trusted image sharing a paragraph with a removed one", () => {
      expect(destinations(gateImages(`![keep](${TRUSTED}) ![bad](${UNTRUSTED})`))).toEqual([TRUSTED]);
    });

    it("keeps the text of a paragraph that wrapped across lines", () => {
      const gated = gateImages(`first line ![bad](${UNTRUSTED})\nsecond line\n`);

      expect(destinations(gated)).toEqual([]);
      expect(gated).toContain("first line");
      expect(gated).toContain("second line");
    });
  });
});
