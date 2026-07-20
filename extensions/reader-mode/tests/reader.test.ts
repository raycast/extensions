/**
 * Reader Mode test suite.
 *
 * Run with `npm test`. Uses Node's built-in test runner — no test framework dependency,
 * and nothing here is bundled into the extension.
 *
 * Every assertion in this file corresponds to something that was silently broken in
 * production. The cleaning pass removed zero elements from every page it saw; the
 * forceParse fallback queried a DOM that Readability had already emptied; paywall
 * detection ran against a thirteen-domain allowlist and so ignored most of the web. All
 * three shipped, for months, because nothing ever asserted otherwise.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseArticle } from "../src/utils/readability";
import { detectPaywall } from "../src/utils/paywall-detector";
import { preCleanHtml } from "../src/utils/html-cleaner";
import {
  loadFixture,
  loadPrivateFixture,
  hasPrivateFixture,
  PAYWALLED_FIXTURES,
  OPEN_FIXTURES,
  PRIVATE_PAYWALLED_FIXTURES,
  PRIVATE_OPEN_FIXTURES,
} from "./fixtures";
import { parseHTML } from "linkedom";

/** Asserts a page's paywall verdict, given a loader for its HTML. */
function assertPaywall(html: string, url: string, site: string, expected: boolean) {
  const parsed = parseArticle(html, url, { skipPreCheck: true, forceParse: true });
  const textContent = parsed.success ? parsed.article.textContent : "";
  const description = parsed.success ? parsed.article.description : null;

  const result = detectPaywall({ textContent, html, description }, url);

  assert.equal(
    result.isPaywalled,
    expected,
    `${site}: expected paywalled=${expected}, got ${result.isPaywalled} (score ${result.score}). ` +
      `Signals: ${result.signals.map((s) => `${s.name}=${s.detail}`).join("; ") || "none"}`,
  );
}

describe("paywall detection", () => {
  // Committed synthetic fixtures — always run, on any checkout.
  for (const { file, url, site } of PAYWALLED_FIXTURES) {
    it(`detects the paywall on ${site}`, () => assertPaywall(loadFixture(file), url, site, true));
  }

  for (const { file, url, site } of OPEN_FIXTURES) {
    it(`does not cry paywall on ${site}`, () => assertPaywall(loadFixture(file), url, site, false));
  }

  // Real captured pages — higher fidelity, only when the private corpus is present.
  for (const { file, url, site } of PRIVATE_PAYWALLED_FIXTURES) {
    it(`detects the paywall on ${site}`, { skip: !hasPrivateFixture(file) && `no private corpus` }, () =>
      assertPaywall(loadPrivateFixture(file), url, site, true),
    );
  }

  for (const { file, url, site } of PRIVATE_OPEN_FIXTURES) {
    it(`does not cry paywall on ${site}`, { skip: !hasPrivateFixture(file) && `no private corpus` }, () =>
      assertPaywall(loadPrivateFixture(file), url, site, false),
    );
  }

  it("does not depend on a domain allowlist", () => {
    // The old detector returned isPaywalled:false for any site not among thirteen
    // hardcoded domains, so every.to's wall was invisible. Detection must be evidence-based.
    const textContent = "Article text. ".repeat(20) + " Create a free account to continue reading";
    const result = detectPaywall({ textContent }, "https://never-heard-of-it.example/post");

    assert.equal(result.isPaywalled, true, "an unknown domain's paywall must still be detected");
  });

  it("ignores a passing mention of subscriptions in an honest article", () => {
    // A long article about the news business will say "subscribe now" without being gated.
    const textContent =
      "The publisher's strategy hinged on getting readers to subscribe now, a phrase that " +
      "appears on every page of the site. ".repeat(60);

    const result = detectPaywall({ textContent }, "https://example.com/media-criticism");

    assert.equal(result.isPaywalled, false, `false positive (score ${result.score})`);
  });

  // Regression: the barrier-element scan is DOM-based and visibility-aware. A paywall class in
  // markup that is not rendered — hidden by attribute, inline style, an inert container, or a
  // hidden ancestor — must not convict a fully readable article, because that would route a good
  // article through the bypass waterfall where a longer archived parse could replace it. Only a
  // *visible* barrier counts.
  const READABLE_BODY = `<main><article><h1>Free Article</h1><p>${"Full readable body. ".repeat(60)}</p></article></main>`;
  // Bodies use neutral text ("members zone"), NOT gating phrases like "subscribe to continue" —
  // otherwise `barrier-phrase` would fire independently of the DOM check and the test would pass
  // for the wrong reason. Here we are asserting the DOM-visibility path specifically.
  const HIDDEN_BARRIERS: Array<[string, string]> = [
    ["a hidden attribute", `<div hidden class="article-gate">members zone</div>`],
    ["inline display:none", `<div style="display:none" class="article-gate">members zone</div>`],
    ["inline visibility:hidden", `<div style="visibility:hidden" class="paywall">members zone</div>`],
    ["a hidden ancestor", `<div hidden><div class="paywall">members zone</div></div>`],
    ["an inert template", `<template id="paywall"><div class="article-gate">members zone</div></template>`],
  ];

  for (const [how, barrier] of HIDDEN_BARRIERS) {
    it(`does not convict on a barrier hidden by ${how}`, () => {
      const html =
        `<!doctype html><html><head><title>Free Article</title>` +
        `<meta property="og:description" content="A normal article."></head>` +
        `<body>${READABLE_BODY}${barrier}</body></html>`;

      const parsed = parseArticle(html, "https://example.com/free", { skipPreCheck: true, forceParse: true });
      const textContent = parsed.success ? parsed.article.textContent : "";
      const description = parsed.success ? parsed.article.description : null;

      const result = detectPaywall({ textContent, html, description }, "https://example.com/free");

      assert.equal(
        result.isPaywalled,
        false,
        `a barrier hidden by ${how} convicted a readable article (score ${result.score}): ` +
          result.signals.map((s) => s.name).join(", "),
      );
    });
  }

  // Regression: an inline `<style>` block can hide a barrier by class or id, so barrier markup
  // controlled by a same-page stylesheet must not count as visible either.
  const STYLESHEET_HIDDEN: Array<[string, string, string]> = [
    ["a class rule", `<style>.article-gate{display:none}</style>`, `<div class="article-gate">Subscribe</div>`],
    ["an id rule", `<style>#paywall{visibility:hidden}</style>`, `<div id="paywall" class="x">Subscribe</div>`],
    ["a hidden ancestor rule", `<style>.wrap{display:none}</style>`, `<div class="wrap"><div class="paywall">Subscribe</div></div>`],
  ];

  for (const [how, style, barrier] of STYLESHEET_HIDDEN) {
    it(`does not convict on a barrier hidden by ${how}`, () => {
      const html =
        `<!doctype html><html><head><title>Free Article</title>${style}</head>` +
        `<body>${READABLE_BODY}${barrier}</body></html>`;

      const parsed = parseArticle(html, "https://example.com/free", { skipPreCheck: true, forceParse: true });
      const textContent = parsed.success ? parsed.article.textContent : "";
      const result = detectPaywall({ textContent, html }, "https://example.com/free");

      assert.equal(
        result.isPaywalled,
        false,
        `a stylesheet-hidden barrier (${how}) convicted a readable article (score ${result.score})`,
      );
    });
  }

  // These assert the DOM barrier path specifically: the barrier carries NO gating phrase in its
  // text (so `barrier-phrase` can't fire), the body is long enough that `short-body` can't reach
  // the threshold alone, and detection therefore rests on `barrier-element` finding a *visible*
  // barrier. Each would fail if the DOM-visibility logic regressed.
  const VISIBLE_BARRIERS: Array<[string, string]> = [
    ["a plain visible barrier", `<div class="article__wrapper--premium">members zone</div>`],
    // A capitalized class name — the DOM selector match must be case-insensitive.
    ["a capitalized barrier class", `<div class="Paywall">members zone</div>`],
    // aria-hidden removes from the a11y tree, not the page: a sighted reader still sees this.
    ["a barrier marked aria-hidden", `<div class="paywall" aria-hidden="true">members zone</div>`],
    // A page-level hide rule that targets an UNRELATED class must not suppress a real barrier.
    [
      "a visible barrier despite an unrelated hide rule",
      `<div class="article-gate">members zone</div>`,
    ],
  ];

  for (const [how, barrier] of VISIBLE_BARRIERS) {
    it(`detects ${how}`, () => {
      const html =
        `<!doctype html><html><head><title>Story</title><style>.promo{display:none}</style></head>` +
        `<body><main><article><p>A short free preview of the story.</p>${barrier}</article></main></body></html>`;

      const parsed = parseArticle(html, "https://example.com/story", { skipPreCheck: true, forceParse: true });
      const textContent = parsed.success ? parsed.article.textContent : "";

      const result = detectPaywall({ textContent, html }, "https://example.com/story");

      assert.equal(
        result.isPaywalled,
        true,
        `${how}: went undetected (score ${result.score}); signals: ${result.signals.map((s) => s.name).join(", ")}`,
      );
      assert.ok(
        result.signals.some((s) => s.name === "barrier-element"),
        `${how}: detected, but NOT via the DOM barrier path — signals: ${result.signals.map((s) => s.name).join(", ")}`,
      );
    });
  }

  // A false positive is not a harmless mistake: it sends a perfectly readable article through
  // six network bypass attempts, and can end up replacing it with a worse archived copy. These
  // are the innocent pages that an over-eager scorer condemns.
  const INNOCENT_PAGES: Array<[string, Parameters<typeof detectPaywall>[0]]> = [
    ["a short post that trails off", { textContent: "A brief thought about the news today…" }],
    ["a short post, plain and complete", { textContent: "Quick note: the build is green." }],
    [
      "a short post with a long SEO description",
      {
        textContent: "Three sentences of an actual, quite short post.",
        description:
          "A long, search-engine-optimised description that the CMS generated automatically " +
          "and which runs considerably longer than the post it describes.",
      },
    ],
    [
      "a teaser whose 'continue reading' links to its own permalink",
      { textContent: "Intro paragraph of a short post. Continue reading" },
    ],
    [
      "a page with unrelated 'premium' and 'wrapper' classes",
      {
        textContent: "Real article prose. ".repeat(200),
        html: `<div class="premium-badge">Pro</div><div class="wrapper">${"content ".repeat(500)}</div>`,
      },
    ],
    [
      "an article with a newsletter pitch and an overlong SEO description",
      {
        // Two circumstantial signals at once — a keyword and a description longer than the
        // body — must still not convict, because neither is evidence of an actual barrier.
        textContent: "Real article prose about the news business. ".repeat(25) + " Subscribe now for more.",
        description: "An unusually long search-engine description. ".repeat(30),
      },
    ],
  ];

  for (const [description, evidence] of INNOCENT_PAGES) {
    it(`does not flag ${description}`, () => {
      const result = detectPaywall(evidence, "https://example.com/post");

      assert.equal(
        result.isPaywalled,
        false,
        `false positive (score ${result.score}): ${result.signals.map((s) => s.name).join(", ")}`,
      );
    });
  }

  it("never convicts a page on circumstantial evidence alone", () => {
    // The invariant the weights exist to uphold: no barrier markup and no gating language
    // means no verdict, however many weaker signals happen to pile up. Guarding it directly
    // means a future signal cannot quietly reintroduce a false positive by adding weight.
    const everySoftSignal = {
      // short body, ends in an ellipsis, quotes subscription marketing, and its description
      // is longer than it is — every circumstantial signal the detector knows how to raise.
      textContent: "Subscribe now, the site said…",
      description: "A description considerably longer than the body of the post itself. ".repeat(5),
    };

    const result = detectPaywall(everySoftSignal, "https://example.com/post");

    assert.equal(
      result.isPaywalled,
      false,
      `circumstantial signals alone reached a verdict (score ${result.score}): ` +
        result.signals.map((s) => `${s.name}=${s.weight}`).join(", "),
    );
  });
});

describe("html cleaning", () => {
  it("actually removes page chrome", () => {
    // Regression: protecting every descendant of <main>/<article> made ~97% of a page
    // unremovable, so the entire NEGATIVE_SELECTORS list removed nothing on any real site.
    const html = `<html><body>
      <nav class="site-nav">nav links</nav>
      <main><article><p>${"Article body. ".repeat(40)}</p>
        <aside class="sidebar">promoted junk</aside>
        <div class="newsletter-signup">Subscribe to our newsletter</div>
      </article></main>
      <footer class="site-footer">footer junk</footer>
    </body></html>`;

    const { document } = parseHTML(html);
    const result = preCleanHtml(document, "https://example.com/post");

    assert.ok(result.removedCount > 0, "cleaning removed nothing at all");

    const remaining = document.body?.textContent ?? "";
    assert.ok(!remaining.includes("nav links"), "navigation survived cleaning");
    assert.ok(!remaining.includes("footer junk"), "footer survived cleaning");
    assert.ok(remaining.includes("Article body."), "cleaning ate the article");
  });

  it("does not remove article content that merely matches a chrome selector", () => {
    // Regression: [class*="meta"] matched a real wrapper like "article-metadata-body"
    // and deleted the whole article with it.
    const body = `<p>${"Genuine article prose. ".repeat(40)}</p>`;
    const html = `<html><body><main><article>
      <div class="article-metadata-body">${body}</div>
    </article></main></body></html>`;

    const { document } = parseHTML(html);
    preCleanHtml(document, "https://example.com/post");

    const remaining = document.body?.textContent ?? "";
    assert.ok(remaining.includes("Genuine article prose."), "cleaner deleted the article body");
  });
});

describe("article parsing", () => {
  it("recovers content via forceParse when Readability gives up", () => {
    // Regression: Readability.parse() consumes the document, so the fallback used to query
    // a DOM that had already been emptied and could never succeed.
    const divs = Array.from({ length: 12 }, (_, i) => `<div>Sentence ${i} of real article prose.</div>`).join("");
    const html = `<html><head><title>T</title></head><body><main>
      <div class="entry-content">${divs}</div>
    </main></body></html>`;

    const result = parseArticle(html, "https://example.com/post", { skipPreCheck: true, forceParse: true });

    assert.equal(result.success, true, "forceParse fallback recovered nothing");
    if (result.success) {
      assert.match(result.article.textContent, /Sentence 0 of real article prose/);
    }
  });

  it("extracts metadata and body from an article", () => {
    const html = loadFixture("open-article.html");
    const result = parseArticle(html, "https://example.com/post", { skipPreCheck: true, forceParse: true });

    assert.equal(result.success, true);
    if (result.success) {
      assert.ok(result.article.title.length > 0, "no title extracted");
      assert.ok(result.article.textContent.length > 200, "suspiciously little text extracted");
    }
  });

  // The memory regression only manifests on a genuinely large page, so this runs against the
  // real captured corpus when present. The synthetic fixtures are deliberately small.
  it("stays within Raycast's memory budget on a large page", { skip: !hasPrivateFixture("sfchronicle.html") }, () => {
    // Regression: parseArticle built three DOMs of the same page at once and a ~2MB
    // article blew the 100MB heap limit outright.
    const html = loadPrivateFixture("sfchronicle.html");

    global.gc?.();
    const before = process.memoryUsage().heapUsed;
    parseArticle(html, "https://www.sfchronicle.com/article", { skipPreCheck: true, forceParse: true });
    const used = process.memoryUsage().heapUsed - before;

    const LIMIT = 100 * 1024 * 1024;
    assert.ok(used < LIMIT, `parse used ${(used / 1048576).toFixed(1)}MB of the 100MB budget`);
  });
});
