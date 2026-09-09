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

    it("escapes nothing inside code when it falls back to escaping", () => {
      // A definition split across lines is past what the targeted removals read,
      // so this document reaches the escaping fallback.
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
});
