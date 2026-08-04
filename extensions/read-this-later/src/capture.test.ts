import { describe, it, expect } from "vitest";
import {
  extract,
  isStub,
  buildEnvelope,
  encryptBody,
  stripBoilerplateHtml,
} from "./capture";
import { decryptBody, parseEnvelope } from "./offline";

const TOKEN = "0123456789abcdef".repeat(4);
const URL = "https://www.nytimes.com/2026/07/15/story.html";

const PROSE = "Substantial article prose that clears the stub threshold. ";

function page(body: string): string {
  return `<!DOCTYPE html><html><head><title>Site Name</title></head><body>
    <nav>Home About Subscribe</nav><aside>ADVERTISEMENT</aside>
    <article>${body}</article>
    <footer>Footer junk</footer></body></html>`;
}

describe("extract", () => {
  it("keeps the article and drops the page furniture", () => {
    const e = extract(page(`<h1>Headline</h1><p>${PROSE.repeat(40)}</p>`), URL);
    expect(e).not.toBeNull();
    expect(e?.html).toContain("Substantial article prose");
    expect(e?.html).not.toContain("Subscribe");
    expect(e?.html).not.toContain("ADVERTISEMENT");
    expect(e?.html).not.toContain("Footer junk");
  });

  it("strips scripts even if Readability kept them", () => {
    const e = extract(
      page(`<p>${PROSE.repeat(40)}</p><script>tracker()</script>`),
      URL,
    );
    expect(e?.html).not.toContain("tracker");
  });

  // The trap: we parse HTML detached from the page it came from, so without a
  // base URL every relative asset would break on whatever device reads it next.
  it("absolutises relative image and link URLs against the page URL", () => {
    const e = extract(
      page(
        `<p>${PROSE.repeat(40)}</p><img src="/img/photo.jpg" alt="x"><p><a href="/related">More</a></p>`,
      ),
      URL,
    );
    expect(e?.html).toContain('src="https://www.nytimes.com/img/photo.jpg"');
    expect(e?.html).toContain('href="https://www.nytimes.com/related"');
    expect(e?.html).not.toContain('src="/img/photo.jpg"');
  });

  // Readability almost never gives up: handed a page with no article it still
  // returns a result, just a tiny one (here length 7, the nav text). So the
  // null branch is close to unreachable and isStub is the real gate — which is
  // why the browser extension has the same length threshold.
  it("still returns something for a page with no article, caught by isStub", () => {
    const e = extract("<html><body><nav>nothing</nav></body></html>", URL);
    expect(e).not.toBeNull();
    expect(e!.length).toBeLessThan(50);
    expect(isStub(e!)).toBe(true);
  });
});

describe("stripBoilerplateHtml", () => {
  // NYT's real shape: an ad wrapper holding two boilerplate leaves.
  it("removes an NYT ad slot and its skip link", () => {
    const out = stripBoilerplateHtml(
      `<div class="ad"><span>Advertisement</span><a href="#after">SKIP ADVERTISEMENT</a></div><p>Real text.</p>`,
    );
    expect(out).not.toMatch(/Advertisement/i);
    expect(out).toContain("Real text.");
  });

  it("keeps a paragraph that merely mentions advertising", () => {
    const html = `<p>Advertisement revenue fell 12% last quarter.</p>`;
    expect(stripBoilerplateHtml(html)).toContain("Advertisement revenue fell");
  });

  it("does not strip an image or link out of real prose", () => {
    const html = `<p>Text <a href="https://e.com/x">link</a>.</p><img src="https://e.com/i.jpg" alt="x">`;
    const out = stripBoilerplateHtml(html);
    expect(out).toContain('href="https://e.com/x"');
    expect(out).toContain('src="https://e.com/i.jpg"');
  });

  it("leaves a clean article byte-identical", () => {
    const html = `<h2>Section</h2><p>Body.</p>`;
    expect(stripBoilerplateHtml(html)).toBe(html);
  });
});

describe("isStub", () => {
  // Mirrors OFFLINE_MIN_LENGTH in dia-read-later/offline.js: a paywalled page
  // yields a short teaser, which must be rejected rather than cached as junk.
  it("rejects a paywalled teaser", () => {
    const e = extract(
      page(`<p>Subscribe to keep reading this story.</p>`),
      URL,
    );
    if (e) expect(isStub(e)).toBe(true);
  });

  it("accepts a full article", () => {
    const e = extract(page(`<p>${PROSE.repeat(40)}</p>`), URL);
    expect(e).not.toBeNull();
    expect(isStub(e!)).toBe(false);
  });

  it("draws the line at 1500 characters", () => {
    expect(isStub({ length: 1499 } as never)).toBe(true);
    expect(isStub({ length: 1500 } as never)).toBe(false);
  });
});

describe("envelope round-trip", () => {
  // Whatever we encrypt here must be readable by the reader in offline.ts —
  // and by the browser extension and iOS app, which share this wire format.
  it("survives encrypt -> decrypt -> parse", () => {
    const e = extract(page(`<h1>Headline</h1><p>${PROSE.repeat(40)}</p>`), URL);
    const envelope = buildEnvelope(URL, e!);
    const wire = encryptBody(JSON.stringify(envelope), TOKEN);

    const back = parseEnvelope(decryptBody(wire, TOKEN));

    expect(back.v).toBe(1);
    expect(back.url).toBe(URL);
    expect(back.html).toBe(e!.html);
    expect(back.length).toBe(e!.length);
    expect(back.capturedAt).toBe(envelope.capturedAt);
  });

  it("uses a fresh iv every time, so the same body never encrypts alike", () => {
    const a = encryptBody("same plaintext", TOKEN);
    const b = encryptBody("same plaintext", TOKEN);
    expect(a).not.toBe(b);
    expect(decryptBody(a, TOKEN)).toBe(decryptBody(b, TOKEN));
  });

  it("cannot be opened with a different token", () => {
    const wire = encryptBody("secret", TOKEN);
    expect(() => decryptBody(wire, "f".repeat(64))).toThrow();
  });
});
