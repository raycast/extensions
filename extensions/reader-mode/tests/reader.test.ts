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

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseHTML } from "linkedom";
import {
  applyModelUpdates,
  modelTitle,
  parseModelCatalog,
  planModelUpdates,
  referencedModels,
} from "../scripts/summary-models.mjs";
import { DEFAULT_SUMMARY_MODEL, getAIConfigForStyle, SUMMARY_MODELS } from "../src/config/ai";
import { judgeMarkdown, loadArticleFromUrl, loadArticleViaPaywallHopper } from "../src/utils/article-loader";
import { findPayloadArticles } from "../src/utils/data-payload";
import {
  BINGBOT_USER_AGENT,
  fetchHtmlAsBingbot,
  fetchHtmlAsGooglebot,
  GOOGLEBOT_USER_AGENT,
} from "../src/utils/fetcher";
import { preCleanHtml } from "../src/utils/html-cleaner";
import {
  findMarkdownAlternate,
  isMarkdownResponse,
  parseMarkdownArticle,
  stripPageChrome,
  trimToArticle,
} from "../src/utils/markdown-source";
import { detectPaywall } from "../src/utils/paywall-detector";
import { tryBypassPaywall } from "../src/utils/paywall-hopper";
import { parseArticle } from "../src/utils/readability";
import { runExclusive } from "../src/utils/run-exclusive";
import { regenerateNeedsRevalidate } from "../src/utils/summarizer";
import {
  hasPrivateFixture,
  loadFixture,
  loadPrivateFixture,
  OPEN_FIXTURES,
  PAYWALLED_FIXTURES,
  PRIVATE_OPEN_FIXTURES,
  PRIVATE_PAYWALLED_FIXTURES,
} from "./fixtures";
import { AI, stubPreferences } from "./raycast-api-stub";

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

  it("does not convict on circumstantial signals alone", () => {
    // A complete article that quotes "subscribe now", ends in an ellipsis, and carries a long SEO
    // description: three circumstantial points, and no barrier.
    const body =
      "The newsletter business has its own vocabulary, and editors say the phrase they hear most is subscribe now. ".repeat(
        9,
      ) + "And so the pitch goes on...";
    const description = "A long description written by an SEO plugin, longer than any summary needs to be. ".repeat(10);
    const result = detectPaywall({ textContent: body, description }, "https://example.com/essay");
    assert.equal(result.isPaywalled, false, `convicted on ${result.signals.map((s) => s.name).join(", ")}`);
  });

  it("convicts on explicit member-gating language without barrier markup", () => {
    const body = "Reporting on the regional economy, with figures from the latest filings and interviews. ".repeat(12);
    for (const gate of [
      "Sign up to read the full story.",
      "This article is available to members.",
      "You have used your free article limit.",
      "You have a preview view of this article.",
    ]) {
      const result = detectPaywall({ textContent: `${body} ${gate}` }, "https://example.com/news");
      assert.equal(result.isPaywalled, true, `missed: ${gate}`);
    }
    const newsletter = detectPaywall(
      { textContent: `${body} Sign up to read our weekly digest.` },
      "https://example.com/news",
    );
    assert.equal(newsletter.isPaywalled, false, "a newsletter pitch is not a barrier");
  });

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
    [
      "a hidden ancestor rule",
      `<style>.wrap{display:none}</style>`,
      `<div class="wrap"><div class="paywall">Subscribe</div></div>`,
    ],
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
    ["a visible barrier despite an unrelated hide rule", `<div class="article-gate">members zone</div>`],
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
          "A long, search-engine-optimized description that the CMS generated automatically " +
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

describe("crawler user agents", () => {
  // Both crawler bypasses now share one fetch path, so the only thing separating them is the
  // User-Agent string they claim. A copy-paste slip there is invisible — the fetch still
  // succeeds, it just stops being a bypass. Assert what goes on the wire.
  it("sends the exact User-Agent each bypass claims", async () => {
    const seen: string[] = [];
    const server = createServer((req, res) => {
      seen.push(req.headers["user-agent"] ?? "");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><body>ok</body></html>");
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/article`;

    try {
      for (const fetcher of [fetchHtmlAsGooglebot, fetchHtmlAsBingbot]) {
        const result = await fetcher(url);
        assert.ok(result.success, `${fetcher.name} failed against the local server`);
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    assert.deepEqual(seen, [GOOGLEBOT_USER_AGENT, BINGBOT_USER_AGENT]);
  });
});

describe("paywall waterfall", () => {
  // Regression: tryBypassPaywall used to stop at the first HTTP-200 with any HTML. A method
  // that answered with a challenge or the same truncated preview would win and suppress every
  // later method. The validator now rejects such a candidate and the waterfall continues.
  // Here the first method (Googlebot) gets a short page (rejected); the next (Bingbot) gets it.
  it("skips a rejected candidate and keeps trying later methods", async () => {
    const short = "<html><body>subscribe to read</body></html>";
    const long = `<html><body><article>${"real article text. ".repeat(200)}</article></body></html>`;

    // Order-independent: fail the FIRST request, serve content to every one after.
    let hits = 0;
    const server = createServer((_req, res) => {
      hits += 1;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(hits === 1 ? short : long);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/article`;

    try {
      // Validator: accept only pages longer than the short preview.
      const result = await tryBypassPaywall(url, undefined, (html) => (html.length > short.length ? html : null));

      assert.equal(result.success, true, "waterfall should have found a usable candidate");
      assert.equal(result.source, "bingbot", "should skip the rejected first method and accept the second");
      assert.equal(result.validated, long, "should hand back the accepted candidate's payload");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("without a validator, accepts the first method that returns content", async () => {
    const body = "<html><body>anything</body></html>";
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(body);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/article`;

    try {
      const result = await tryBypassPaywall(url);
      assert.equal(result.success, true);
      assert.equal(result.source, "googlebot", "first method wins when nothing rejects it");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("bypass candidate quality gate (loader level)", () => {
  // The production validator must reject a bypass response that is ITSELF a paywall/challenge
  // page — even though Readability happily extracts text from it — and let the waterfall reach
  // a method that returns the real article. This exercises loadArticleViaPaywallHopper end to
  // end: the real fetchers, the real validator (detectPaywall + parse), and buildBypassArticle.
  it("rejects a parseable challenge page and accepts a later real article", async () => {
    const challenge =
      `<!doctype html><html><head><title>Members Only</title></head><body><article>` +
      `<h1>Members Only</h1><p>Subscribe to read the rest of this story. Already a subscriber?</p>` +
      `</article></body></html>`;
    const real =
      `<!doctype html><html><head><title>The Real Story</title></head><body><article><h1>The Real Story</h1>` +
      `<p>${"This is the genuine article body with plenty of real reporting. ".repeat(60)}</p>` +
      `</article></body></html>`;

    // Fail the FIRST request (Googlebot) with the challenge page; the next (Bingbot) gets it.
    let hits = 0;
    const server = createServer((_req, res) => {
      hits += 1;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(hits === 1 ? challenge : real);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/article`;

    try {
      const result = await loadArticleViaPaywallHopper(url, { showArticleImage: false });
      assert.equal(result.status, "success", "should have accepted the real article");
      assert.equal(result.status === "success" && result.article.archiveSource?.service, "bingbot");
      assert.ok(
        result.status === "success" && result.article.textContent.includes("genuine article body"),
        "returned article should be the real one, not the challenge page",
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // The text-only miss: a long teaser (>900 chars, so not short-body) with a VISIBLE barrier
  // element but NO gating phrase or keyword. Only the DOM-based visible-barrier signal catches
  // it, so the validator must pass `html` to detectPaywall. Without that, this teaser is
  // accepted and suppresses the real article behind it.
  it("rejects a text-clean candidate whose only paywall tell is a visible barrier element", async () => {
    const neutral = "The valley road climbed past the old mill and the reservoir in the pale light. ".repeat(20);
    const barriered =
      `<!doctype html><html><head><title>Feature</title></head><body>` +
      `<article><h1>Feature</h1><p>${neutral}</p></article>` +
      `<div data-paywall style="position:fixed;inset:0">   </div>` + // visible overlay, no gating text
      `</body></html>`;
    const real =
      `<!doctype html><html><head><title>The Real Story</title></head><body><article><h1>The Real Story</h1>` +
      `<p>${"This is the genuine article body with plenty of real reporting. ".repeat(60)}</p>` +
      `</article></body></html>`;

    // Fail the FIRST request (Googlebot) with the barriered teaser; the next (Bingbot) gets it.
    let hits = 0;
    const server = createServer((_req, res) => {
      hits += 1;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(hits === 1 ? barriered : real);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/article`;

    try {
      const result = await loadArticleViaPaywallHopper(url, { showArticleImage: false });
      assert.equal(result.status, "success");
      assert.equal(
        result.status === "success" && result.article.archiveSource?.service,
        "bingbot",
        "the visibly-barriered teaser should be rejected in favor of the real article",
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Greptile: a bypass (archive snapshot, Condé Nast page) can return the FULL article while
  // still carrying a visible subscription overlay or a "subscribe" footer. detectPaywall flags
  // that page as gated, but the article text is complete and usable — rejecting it on the
  // marker alone discards real content and drops back to the truncated preview. A candidate
  // with a full article's worth of text must be accepted despite residual paywall markup.
  it("accepts a full article even when the page still carries a visible paywall overlay", async () => {
    // Well over FULL_ARTICLE_TEXT_FLOOR (2000): unmistakably the article, not a teaser — yet the
    // page still ships a VISIBLE .paywall overlay with a gating phrase, exactly what an archive
    // snapshot or a Condé Nast page returns. Under the old "reject on any paywall signal" rule
    // detectPaywall convicted it (barrier + phrase) and the whole flow failed; it must be kept.
    const fullBody = "This is the complete article text, every paragraph present and correct. ".repeat(80);
    const articleWithOverlay =
      `<!doctype html><html><head><title>The Whole Story</title></head><body>` +
      `<article><h1>The Whole Story</h1><p>${fullBody}</p></article>` +
      `<div class="paywall" style="position:fixed;inset:0">Subscribe to read unlimited articles. Already a subscriber?</div>` +
      `</body></html>`;

    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(articleWithOverlay);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/article`;

    try {
      const result = await loadArticleViaPaywallHopper(url, { showArticleImage: false });
      assert.equal(result.status, "success", "a full article must not be discarded over residual paywall markup");
      assert.ok(
        result.status === "success" && result.article.textContent.includes("every paragraph present and correct"),
        "the returned article should be the complete text, not a fallback",
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Codex (on the Greptile fix): a length floor alone would accept ANY long response, so a long
  // subscription/upsell landing page (plan comparisons, FAQs, testimonials — easily >2000 chars)
  // with conclusive gating language would be accepted as "the article" and suppress the archives.
  // Gating phrases in the extracted text are therefore checked at every length; only the overlay
  // DOM signal is relaxed for long content. A long upsell page must still be rejected.
  it("rejects a long subscription/upsell page whose own text carries gating language", async () => {
    // >2000 chars of marketing copy, and it is the article body (survives cleaning), including a
    // conclusive barrier phrase. No real article body contains this.
    const upsell =
      `<!doctype html><html><head><title>Subscribe</title></head><body><article><h1>Choose your plan</h1>` +
      `<p>Already a subscriber? Sign in. ${"Unlimited access to award-winning journalism, the daily crossword, and the complete archive — join thousands of readers who value independent reporting. ".repeat(20)}</p>` +
      `</article></body></html>`;
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(upsell);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/article`;

    try {
      const result = await loadArticleViaPaywallHopper(url, { showArticleImage: false });
      assert.notEqual(result.status, "success", "a long upsell page must not be accepted as the article");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Greptile (2nd): a complete article can embed a gate element (article-gate, content-gate,
  // regwall, piano-*, [data-testid*=subscribe]) whose gating text ("Subscribe to read…") would,
  // if left in the extraction, trip the always-on phrase check and reject the whole article. The
  // cleaner strips those gate containers before extraction, so a full article carrying one is kept
  // and the gate text does not leak into the result.
  it("accepts a full article with an embedded gate element, stripping the gate text", async () => {
    const body = "The mountain path wound upward through pine and granite for the better part of a day. ".repeat(24);
    const articleWithEmbeddedGate =
      `<!doctype html><html><head><title>The Ascent</title></head><body><article><h1>The Ascent</h1>` +
      `<p>${body}</p>` +
      `<div class="content-gate">Subscribe to read the rest of this story. Already a subscriber? Sign in.</div>` +
      `<p>${body}</p>` +
      `</article></body></html>`;
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(articleWithEmbeddedGate);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/article`;

    try {
      const result = await loadArticleViaPaywallHopper(url, { showArticleImage: false });
      assert.equal(result.status, "success", "an embedded gate element must not sink a complete article");
      assert.ok(
        result.status === "success" && result.article.textContent.includes("wound upward through pine"),
        "the real article body should be present",
      );
      assert.ok(
        result.status === "success" && !result.article.textContent.includes("Already a subscriber"),
        "the gate's text should have been stripped, not rendered into the article",
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Codex (on the gate-strip): real sites CAPITALIZE these class names, and the cleaner's
  // matching was case-sensitive while the detector's is not — so a `Content-Gate` survived and
  // still sank the article. The gate selectors are now case-insensitive; a capitalized embedded
  // gate must be stripped too.
  it("strips an embedded gate whose class is capitalized (case-insensitive)", async () => {
    const body = "The river narrowed between the cliffs where the old ferry crossing had once stood. ".repeat(24);
    const articleWithCapsGate =
      `<!doctype html><html><head><title>The Crossing</title></head><body><article><h1>The Crossing</h1>` +
      `<p>${body}</p>` +
      `<div class="Content-Gate Piano-Barrier">Subscribe to read the rest of this story. Already a subscriber?</div>` +
      `<p>${body}</p>` +
      `</article></body></html>`;
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(articleWithCapsGate);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/article`;

    try {
      const result = await loadArticleViaPaywallHopper(url, { showArticleImage: false });
      assert.equal(result.status, "success", "a capitalized gate class must be stripped like a lowercase one");
      assert.ok(
        result.status === "success" && !result.article.textContent.includes("Already a subscriber"),
        "the capitalized gate's text should have been stripped",
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Greptile (3rd): the cleaner's gate list was a hand-picked SUBSET of the detector's
  // BARRIER_SELECTORS, so selectors like [class*="meter-"], .pw-overlay, and [class*="barrier"]
  // still leaked their gating text into the extraction. The cleaner now strips the detector's
  // whole list, so an embedded gate using ANY recognized selector is removed.
  it("strips an embedded gate using a selector only the detector previously knew (barrier/meter)", async () => {
    const body = "The harbor filled with fog as the last of the fishing boats made for the breakwater. ".repeat(24);
    const articleWithBarrierGate =
      `<!doctype html><html><head><title>The Harbor</title></head><body><article><h1>The Harbor</h1>` +
      `<p>${body}</p>` +
      `<div class="content-barrier meter-gate">Subscribe to read the rest of this story. Already a subscriber?</div>` +
      `<p>${body}</p>` +
      `</article></body></html>`;
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(articleWithBarrierGate);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/article`;

    try {
      const result = await loadArticleViaPaywallHopper(url, { showArticleImage: false });
      assert.equal(result.status, "success", "a gate using a detector-only selector must not sink the article");
      assert.ok(
        result.status === "success" && !result.article.textContent.includes("Already a subscriber"),
        "the barrier/meter gate's text should have been stripped",
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("Condé Nast paywall-class content", () => {
  // Regression: the New Yorker (and other Condé Nast sites) serve the full article in the
  // initial HTML and tag every body <p> with class="paywall" for client-side gating. The
  // cleaner's `[class*="paywall"]` removal deleted every one of them — the reader showed the
  // dropcap intro and the cartoons, and nothing else. The fix scopes the removal to :not(p).
  it("keeps <p class='paywall'> body text but still strips overlay containers", () => {
    // Many paragraphs so each is well under the cleaner's 30%-of-page protection threshold —
    // exactly why the real page lost them: individually small, collectively the whole article.
    const para = "The full article body that the site served for free in its HTML. ".repeat(12);
    const paras = Array.from(
      { length: 12 },
      (_, i) => `<p class="${i === 0 ? "has-dropcap paywall" : "paywall"}">${para}</p>`,
    ).join("");
    const html =
      `<html><body><article>${paras}` +
      `<aside class="paywall-inline-barrier"><div class="consumer-marketing-unit--paywall-inline-barrier"></div></aside>` +
      `</article></body></html>`;

    const { document } = parseHTML(html);
    preCleanHtml(document, "https://www.newyorker.com/magazine/2026/04/13/some-article");

    const text = document.body?.textContent ?? "";
    assert.ok(
      text.includes("the site served for free"),
      "body paragraphs tagged class='paywall' must survive cleaning",
    );
    assert.ok(text.length > 5000, `expected the full body to remain, got ${text.length} chars`);
    assert.equal(
      document.querySelector(".paywall-inline-barrier"),
      null,
      "the overlay container (an aside/div) should still be removed",
    );
  });

  // Codex (on the shared-barrier consolidation): `.subscriber-only` marks gated *content*, not
  // gate UI. The per-element 30% guard and `:not(p)` don't protect SEGMENTED content — sibling
  // subscriber-only blocks each under 30% would all be deleted, gutting the article. The cleaner
  // must NOT delete these (detection still scores them from the raw html).
  it("does not delete segmented subscriber-only article content", () => {
    const para = "Subscriber-exclusive reporting that must survive the cleaning pass. ".repeat(8);
    // Four sibling content blocks, each ~25% of the page — all below the 30% protection guard.
    const blocks = Array.from({ length: 4 }, () => `<div class="subscriber-only"><p>${para}</p></div>`).join("");
    const { document } = parseHTML(`<html><body><article><h1>Members Feature</h1>${blocks}</article></body></html>`);
    preCleanHtml(document, "https://example.com/members/feature");
    const text = document.body?.textContent ?? "";
    assert.ok(
      text.includes("Subscriber-exclusive reporting"),
      "subscriber-only content must survive — deleting it guts the article",
    );
    assert.ok(text.length > 1000, `expected the segmented content to remain, got ${text.length} chars`);
  });

  // Greptile (#31933): Medium and the NYT put the article body in a `meteredContent` container,
  // so `[class*="metered"]` marks content, like `.subscriber-only` — detected, never deleted.
  it("does not delete segmented metered article content", () => {
    const para = "Metered reporting that must survive the cleaning pass. ".repeat(8);
    const blocks = Array.from({ length: 4 }, () => `<div class="meteredContent"><p>${para}</p></div>`).join("");
    const { document } = parseHTML(`<html><body><article><h1>Metered Feature</h1>${blocks}</article></body></html>`);
    preCleanHtml(document, "https://example.com/metered/feature");
    const text = document.body?.textContent ?? "";
    assert.ok(text.includes("Metered reporting"), "metered content must survive — deleting it guts the article");
    assert.ok(text.length > 1000, `expected the segmented content to remain, got ${text.length} chars`);
  });

  // ...but only the content wrapper is kept. A small metered *gate* is still gate UI, and its text
  // would make the candidate validator reject a complete article.
  it("still strips a metered gate message inside a full article", () => {
    const para = "Full reporting that the reader came for. ".repeat(8);
    const { document } = parseHTML(
      `<html><body><article><h1>Feature</h1><p>${para}</p><p>${para}</p>` +
        `<div class="meteredMessage"><p>Subscribe to read the full story.</p></div></article></body></html>`,
    );
    preCleanHtml(document, "https://example.com/metered/gate");
    const text = document.body?.textContent ?? "";
    assert.ok(text.includes("Full reporting"), "the article body must survive");
    assert.ok(!text.includes("Subscribe to read"), "the metered gate's text should have been stripped");
  });
});

describe("Summary Model preference", () => {
  const withModel = (summaryModel: string | undefined, fn: () => void) => {
    stubPreferences.summaryModel = summaryModel;
    try {
      fn();
    } finally {
      delete stubPreferences.summaryModel;
    }
  };

  it("keeps each style's own model when the preference is default or unset", () => {
    withModel("default", () => assert.equal(getAIConfigForStyle("eli5").model, "openai-gpt-6-luna"));
    withModel(undefined, () => assert.equal(getAIConfigForStyle("eli5").model, "openai-gpt-6-luna"));
  });

  it("uses the picked model and keeps the style's creativity", () => {
    withModel("Anthropic_Claude_Haiku_5.5", () => {
      const config = getAIConfigForStyle("eli5");
      assert.equal(config.model, "anthropic-claude-haiku-5-5");
      assert.equal(config.creativity, "medium");
    });
  });

  it("lets a model picked with Regenerate with Model… override the preference", () => {
    withModel("Anthropic_Claude_Haiku_4.5", () =>
      assert.equal(getAIConfigForStyle("eli5", "OpenAI_GPT-5.4_nano").model, "openai-gpt-5.4-nano"),
    );
  });

  it("resolves every offered model to itself", () => {
    const models: Record<string, string> = AI.Model;
    for (const { key } of SUMMARY_MODELS) {
      withModel(key, () => assert.equal(getAIConfigForStyle("overview").model, models[key], key));
    }
  });

  it("offers the same models in the preference and the Regenerate submenu", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    const pref = manifest.preferences.find((p: { name: string }) => p.name === "summaryModel");
    const prefKeys = pref.data.map((d: { value: string }) => d.value).filter((v: string) => v !== "default");
    const menuKeys = SUMMARY_MODELS.map((m) => m.key).filter((k) => k !== DEFAULT_SUMMARY_MODEL);
    assert.deepEqual(prefKeys, menuKeys);
  });

  it("falls back to the default when Raycast no longer has the picked model", () => {
    withModel("OpenAI_GPT-4_retired", () => assert.equal(getAIConfigForStyle("overview").model, "openai-gpt-6-luna"));
  });
});

describe("Regenerate", () => {
  const request = {
    prompt: "summarize X",
    currentPrompt: "summarize X",
    fromCache: false,
    model: "OpenAI_GPT-5.4_nano",
    currentModel: "OpenAI_GPT-5.4_nano",
  };

  it("forces a re-run when the same model regenerates a summary generated this session", () => {
    assert.equal(regenerateNeedsRevalidate(request), true);
  });

  it("lets useAI re-run by itself when the summary came from the cache", () => {
    assert.equal(regenerateNeedsRevalidate({ ...request, fromCache: true }), false);
  });

  it("lets useAI re-run by itself when the model or prompt changes", () => {
    assert.equal(regenerateNeedsRevalidate({ ...request, model: "Anthropic_Claude_Haiku_4.5" }), false);
    assert.equal(regenerateNeedsRevalidate({ ...request, currentPrompt: "" }), false);
  });
});

describe("Summary model sync", () => {
  const types = `
export declare namespace AI {
    export enum Model {
        "OpenAI_GPT-6_Luna" = "openai-gpt-6-luna",
        "OpenAI_GPT-5.6_Terra" = "openai-gpt-5.6-terra",
        "OpenAI_GPT-6_Terra" = "openai-gpt-6-terra",
        "Google_Gemini_3.8_Flash" = "google-gemini-3.8-flash",
        "Google_Gemini_3.9_Flash_Lite" = "google-gemini-3.9-flash-lite",
        "xAI_Grok-4.7" = "xai-grok-4.7",
        /** @deprecated Use \`AI.Model["OpenAI_GPT-6_Luna"]\` instead */
        "OpenAI_GPT-5.4_nano" = "openai-gpt-5.4-nano",
        /** @deprecated Use \`AI.Model["xAI_Grok-4.7"]\` instead */
        "xAI_Grok-4.5" = "xai-grok-4.5",
    }
}`;
  const catalog = parseModelCatalog(types);

  it("reads each model and the successor Raycast names for a deprecated one", () => {
    assert.equal(catalog.get("OpenAI_GPT-6_Luna")?.deprecatedFor, undefined);
    assert.equal(catalog.get("OpenAI_GPT-5.4_nano")?.deprecatedFor, "OpenAI_GPT-6_Luna");
    assert.equal(catalog.get("xAI_Grok-4.7")?.value, "xai-grok-4.7");
  });

  it("replaces a deprecated model with its named successor", () => {
    assert.deepEqual(planModelUpdates(catalog, ["OpenAI_GPT-5.4_nano"]), [
      { from: "OpenAI_GPT-5.4_nano", to: "OpenAI_GPT-6_Luna", reason: "deprecated", duplicate: false },
    ]);
  });

  it("moves a model to the newest version of the same line, and only that line", () => {
    assert.deepEqual(planModelUpdates(catalog, ["OpenAI_GPT-5.6_Terra", "Google_Gemini_3.8_Flash"]), [
      { from: "OpenAI_GPT-5.6_Terra", to: "OpenAI_GPT-6_Terra", reason: "newer", duplicate: false },
    ]);
  });

  it("marks a replacement that is already listed as a duplicate", () => {
    const plan = planModelUpdates(catalog, ["xAI_Grok-4.7", "xAI_Grok-4.5"]);
    assert.deepEqual(plan, [{ from: "xAI_Grok-4.5", to: "xAI_Grok-4.7", reason: "deprecated", duplicate: true }]);
  });

  it("refuses a model Raycast no longer has at all", () => {
    assert.throws(() => planModelUpdates(catalog, ["OpenAI_GPT-4_retired"]), /OpenAI_GPT-4_retired/);
  });

  it("titles a model the way the lists already do", () => {
    assert.equal(modelTitle("OpenAI_GPT-5.6_Terra"), "GPT-5.6 Terra");
    assert.equal(modelTitle("Anthropic_Claude_Haiku_5.5"), "Claude Haiku 5.5");
    assert.equal(modelTitle("xAI_Grok-4.7"), "Grok 4.7");
    assert.equal(modelTitle("Google_Gemini_3.1_Pro"), "Gemini 3.1 Pro");
  });

  it("rewrites ai.ts, the manifest, and the stub together", () => {
    const aiTs = [
      `export const DEFAULT_SUMMARY_MODEL: SummaryModelKey = "OpenAI_GPT-5.4_nano";`,
      `  { key: "OpenAI_GPT-5.4_nano", title: "GPT-5.4 nano" },`,
      `  { key: "xAI_Grok-4.7", title: "Grok 4.7" },`,
      `  { key: "xAI_Grok-4.5", title: "Grok 4.5" },`,
      `    model: AI.Model["OpenAI_GPT-5.4_nano"],`,
    ].join("\n");
    const manifest = {
      preferences: [
        {
          name: "summaryModel",
          data: [
            { title: "Default (GPT-5.4 nano)", value: "default" },
            { title: "Grok 4.7", value: "xAI_Grok-4.7" },
            { title: "Grok 4.5", value: "xAI_Grok-4.5" },
          ],
        },
      ],
    };
    const stub = `  Model: {\n    "xAI_Grok-4.7": "xai-grok-4.7",\n  },`;
    const plan = planModelUpdates(catalog, ["OpenAI_GPT-5.4_nano", "xAI_Grok-4.7", "xAI_Grok-4.5"]);
    const out = applyModelUpdates({ plan, catalog, defaultKey: "OpenAI_GPT-5.4_nano", aiTs, manifest, stub });

    assert.equal(
      out.aiTs,
      [
        `export const DEFAULT_SUMMARY_MODEL: SummaryModelKey = "OpenAI_GPT-6_Luna";`,
        `  { key: "OpenAI_GPT-6_Luna", title: "GPT-6 Luna" },`,
        `  { key: "xAI_Grok-4.7", title: "Grok 4.7" },`,
        `    model: AI.Model["OpenAI_GPT-6_Luna"],`,
      ].join("\n"),
    );
    assert.deepEqual(out.manifest.preferences[0].data, [
      { title: "Default (GPT-6 Luna)", value: "default" },
      { title: "Grok 4.7", value: "xAI_Grok-4.7" },
    ]);
    assert.match(out.stub, /"OpenAI_GPT-6_Luna": "openai-gpt-6-luna",/);
  });

  it("keeps the default first and drops its separate row when it is deprecated into a listed model", () => {
    const aiTs = [
      `  { key: "OpenAI_GPT-5.4_nano", title: "GPT-5.4 nano" },`,
      `  { key: "xAI_Grok-4.7", title: "Grok 4.7" },`,
      `  { key: "OpenAI_GPT-6_Luna", title: "GPT-6 Luna" },`,
    ].join("\n");
    const manifest = {
      preferences: [
        {
          name: "summaryModel",
          data: [
            { title: "Default (GPT-5.4 nano)", value: "default" },
            { title: "Grok 4.7", value: "xAI_Grok-4.7" },
            { title: "GPT-6 Luna", value: "OpenAI_GPT-6_Luna" },
          ],
        },
      ],
    };
    const plan = planModelUpdates(catalog, ["OpenAI_GPT-5.4_nano", "xAI_Grok-4.7", "OpenAI_GPT-6_Luna"]);
    const out = applyModelUpdates({ plan, catalog, defaultKey: "OpenAI_GPT-5.4_nano", aiTs, manifest, stub: "" });

    assert.equal(
      out.aiTs,
      [`  { key: "OpenAI_GPT-6_Luna", title: "GPT-6 Luna" },`, `  { key: "xAI_Grok-4.7", title: "Grok 4.7" },`].join(
        "\n",
      ),
    );
    assert.deepEqual(out.manifest.preferences[0].data, [
      { title: "Default (GPT-6 Luna)", value: "default" },
      { title: "Grok 4.7", value: "xAI_Grok-4.7" },
    ]);
  });

  it("reads a deprecation whose comment wraps across lines", () => {
    const wrapped = parseModelCatalog(`
    export enum Model {
        "OpenAI_GPT-6_Luna" = "openai-gpt-6-luna",
        /**
         * @deprecated
         * Use \`AI.Model["OpenAI_GPT-6_Luna"]\` instead
         */
        "OpenAI_GPT-5.4_nano" = "openai-gpt-5.4-nano",
    }`);
    assert.equal(wrapped.get("OpenAI_GPT-5.4_nano")?.deprecatedFor, "OpenAI_GPT-6_Luna");
  });

  it("refuses a deprecated model whose successor it can't read", () => {
    const unnamed = parseModelCatalog(`
    export enum Model {
        /** @deprecated Retired. */
        "OpenAI_GPT-5.4_nano" = "openai-gpt-5.4-nano",
    }`);
    assert.throws(() => planModelUpdates(unnamed, ["OpenAI_GPT-5.4_nano"]), /OpenAI_GPT-5.4_nano/);
  });

  it("checks every model ai.ts names, not just the menu", () => {
    const aiTs = [
      `export const DEFAULT_SUMMARY_MODEL: SummaryModelKey = "OpenAI_GPT-6_Luna";`,
      `  { key: "OpenAI_GPT-6_Luna", title: "GPT-6 Luna" },`,
      `    model: AI.Model["OpenAI_GPT-5.4_nano"],`,
    ].join("\n");
    const keys = referencedModels(aiTs);
    assert.deepEqual(keys, ["OpenAI_GPT-6_Luna", "OpenAI_GPT-5.4_nano"]);
    assert.deepEqual(planModelUpdates(catalog, keys), [
      { from: "OpenAI_GPT-5.4_nano", to: "OpenAI_GPT-6_Luna", reason: "deprecated", duplicate: true },
    ]);
  });

  it("renames a menu row whose replacement only a style uses, instead of dropping it", () => {
    const aiTs = [
      `export const DEFAULT_SUMMARY_MODEL: SummaryModelKey = "OpenAI_GPT-6_Luna";`,
      `  { key: "OpenAI_GPT-6_Luna", title: "GPT-6 Luna" },`,
      `  { key: "OpenAI_GPT-5.6_Terra", title: "GPT-5.6 Terra" },`,
      `    model: AI.Model["OpenAI_GPT-6_Terra"],`,
    ].join("\n");
    const manifest = {
      preferences: [
        {
          name: "summaryModel",
          data: [
            { title: "Default (GPT-6 Luna)", value: "default" },
            { title: "GPT-5.6 Terra", value: "OpenAI_GPT-5.6_Terra" },
          ],
        },
      ],
    };
    const plan = planModelUpdates(catalog, referencedModels(aiTs), ["OpenAI_GPT-6_Luna", "OpenAI_GPT-5.6_Terra"]);
    const out = applyModelUpdates({ plan, catalog, defaultKey: "OpenAI_GPT-6_Luna", aiTs, manifest, stub: "" });
    assert.match(out.aiTs, /\{ key: "OpenAI_GPT-6_Terra", title: "GPT-6 Terra" \}/);
    assert.deepEqual(out.manifest.preferences[0].data[1], { title: "GPT-6 Terra", value: "OpenAI_GPT-6_Terra" });
  });

  it("ignores models named only in comments", () => {
    const aiTs = [
      `// Previously used AI.Model["OpenAI_GPT-4_retired"].`,
      `/* Also { key: "OpenAI_GPT-3_retired", title: "x" } */`,
      `export const DEFAULT_SUMMARY_MODEL: SummaryModelKey = "OpenAI_GPT-6_Luna";`,
    ].join("\n");
    assert.deepEqual(referencedModels(aiTs), ["OpenAI_GPT-6_Luna"]);
  });

  it("finds nothing to change in the shipped lists against the installed Raycast API", () => {
    const installed = parseModelCatalog(
      readFileSync(join(process.cwd(), "node_modules/@raycast/api/types/index.d.ts"), "utf8"),
    );
    assert.deepEqual(
      planModelUpdates(installed, referencedModels(readFileSync(join(process.cwd(), "src/config/ai.ts"), "utf8"))),
      [],
    );
  });
});

describe("Nuxt data payload", () => {
  const TEASER_URL = "https://www.example.test/news/2026/harbor-labs.html";
  const teaser = loadFixture("nuxt-payload-teaser.html");
  const payloadScript = teaser.match(/<script[^>]*id="__NUXT_DATA__">[\s\S]*?<\/script>/)![0];
  const teaserBody = teaser.match(/<article[\s\S]*?<\/article>/)![0];
  const page = (body: string, script = payloadScript) =>
    `<!DOCTYPE html><html><head><title>Example</title></head><body>${body}${script}</body></html>`;
  // Escaped as Nuxt does, so markup inside the payload can't close its <script> early.
  const nuxt = (payload: unknown) =>
    `<script type="application/json" id="__NUXT_DATA__">${JSON.stringify(payload).replace(/</g, "\\u003c")}</script>`;
  // The teaser's article paragraphs, as the payload holds them.
  const articleParagraphs = (JSON.parse(payloadScript.replace(/^<script[^>]*>|<\/script>$/g, "")) as unknown[]).filter(
    (s): s is string => typeof s === "string" && s.endsWith("&nbsp;"),
  );
  const fullArticle = `<article><h1>Example</h1>${articleParagraphs.map((p) => `<p>${p}</p>`).join("")}</article>`;

  /** A devalue payload holding block lists; each list is `[type, html][]`. */
  function payloadWith(...lists: [string, string][][]) {
    const payload: unknown[] = [null];
    const add = (value: unknown) => payload.push(value) - 1;
    const listIndexes = lists.map((list) => add(list.map(([type, html]) => add({ type: add(type), html: add(html) }))));
    payload[0] = Object.fromEntries(listIndexes.map((index, i) => [`list${i}`, index]));
    return payload;
  }
  const paragraphs = (texts: string[]): [string, string][] => texts.map((text) => ["paragraph", text]);

  it("reads the whole article from the payload when the page shows a teaser", () => {
    const result = parseArticle(teaser, TEASER_URL);
    assert.ok(result.success, "the teaser page should parse from its payload");
    const { content, textContent, title, recoveredFromPayload } = result.article;
    assert.match(textContent, /SENTINEL-LAST-PARAGRAPH/, "the last payload paragraph is missing");
    assert.doesNotMatch(textContent, /RESERVED FOR SUBSCRIBERS/, "the subscribe wall leaked in");
    assert.match(content, /<li>The deal closes next quarter\.<\/li>/, "the highlights list is missing");
    assert.match(content, /<h2>What the buyer gets<\/h2>/, "a subhead block should become a heading");
    assert.match(content, /href="https:\/\/www\.example\.test\/news\/example-corp"/, "relative links must resolve");
    assert.equal(title, "Example Corp. buys Harbor Labs");
    assert.equal(recoveredFromPayload, true, "the payload held far more than the teaser");
  });

  it("keeps Readability's result when the page already shows the whole article", () => {
    const html = page(fullArticle.replace("</article>", '<img src="https://example.test/visible-only.jpg"></article>'));
    const result = parseArticle(html, TEASER_URL);
    assert.ok(result.success);
    assert.match(result.article.content, /visible-only\.jpg/, "the visible article should win over an equal payload");
    assert.ok(!result.article.recoveredFromPayload);
  });

  it("doesn't replace a complete article with a longer list from the payload", () => {
    const comments = paragraphs(
      Array.from(
        { length: 30 },
        (_, i) => `COMMENT-SENTINEL ${i}: I have opinions about this acquisition and here they are at length.`,
      ),
    );
    const article = paragraphs(articleParagraphs);
    for (const payload of [payloadWith(article, comments), payloadWith(comments)]) {
      const result = parseArticle(page(fullArticle, nuxt(payload)), TEASER_URL);
      assert.ok(result.success);
      assert.doesNotMatch(result.article.textContent, /COMMENT-SENTINEL/, "comments replaced the article");
      assert.match(result.article.textContent, /SENTINEL-LAST-PARAGRAPH/);
    }
  });

  it("doesn't take a payload list the page doesn't show any of", () => {
    const cards = paragraphs(
      Array.from(
        { length: 10 },
        (_, i) => `CARD-SENTINEL ${i}: a story about something else entirely, told at some length.`,
      ),
    );
    const result = parseArticle(page("<nav><a href='/'>Home</a></nav>", nuxt(payloadWith(cards))), TEASER_URL);
    assert.equal(result.success, false, "a list the page never shows is not this page's article");
  });

  it("doesn't take a list of head tags for the article", () => {
    const description = "A meta description long enough to outweigh a short article in a naive scorer. ".repeat(3);
    const payload: unknown[] = [{ head: 1 }, [2, 5, 8, 11]];
    for (let i = 0; i < 4; i++)
      payload.push({ name: payload.length + 1, content: payload.length + 2 }, "description", description);
    const result = parseArticle(
      page(`<nav><a href='/'>Home</a></nav><p>${description}</p>`, nuxt(payload)),
      TEASER_URL,
    );
    assert.equal(result.success, false, "meta tags are not an article");
  });

  it("passes over a list that is mostly scripts and embeds", () => {
    const embeds: [string, string][] = Array.from({ length: 10 }, (_, i) => [
      "embed",
      `<script>window.track${i}("${"x".repeat(400)}")</script>`,
    ]);
    // The teaser's opening paragraph is in both lists, so both are tied to the page.
    const payload = payloadWith(paragraphs(articleParagraphs), [
      ...paragraphs(articleParagraphs.slice(0, 1)),
      ...embeds,
    ]);
    const result = parseArticle(page(teaserBody, nuxt(payload)), TEASER_URL);
    assert.ok(result.success);
    assert.match(result.article.textContent, /SENTINEL-LAST-PARAGRAPH/, "an embed list that comes out empty won");
  });

  it("keeps image blocks and resolves their URLs", () => {
    const list: [string, string][] = [
      ...paragraphs(articleParagraphs.slice(0, 3)),
      ["image", '<figure><img src="../media/chart.png" alt="A chart"></figure>'],
      ...paragraphs(articleParagraphs.slice(3)),
    ];
    const result = parseArticle(page(teaserBody, nuxt(payloadWith(list))), TEASER_URL);
    assert.ok(result.success);
    assert.match(result.article.content, /src="https:\/\/www\.example\.test\/news\/media\/chart\.png"/);
  });

  it("bounds a payload that points at one long block many times", () => {
    const long = "A paragraph long enough to matter, repeated by reference rather than by copy. ".repeat(250);
    // One block, listed 3,000 times: a 20 KB payload that expands to 60 MB if each copy is built.
    const payload: unknown[] = [{ list: 1 }, [], { type: 3, html: 4 }, "paragraph", long];
    (payload[1] as number[]).push(...Array.from({ length: 3000 }, () => 2));
    globalThis.gc?.();
    const before = process.memoryUsage().heapUsed;
    // The page shows the block, so only the bound stands between it and a 60 MB article.
    parseArticle(page(`<article><p>${long}</p></article>`, nuxt(payload)), TEASER_URL);
    const grewMB = (process.memoryUsage().heapUsed - before) / 1e6;
    assert.ok(grewMB < 40, `heap grew ${Math.round(grewMB)} MB`);
  });

  it("walks a large, self-referencing payload in linear time", () => {
    // Under the 5 MB cap, so the walker runs; the article sits at the far end of the chain.
    const article = payloadWith(paragraphs(articleParagraphs));
    const offset = 60_000;
    const payload: unknown[] = [];
    // The chain's last link points at the article's list, reached only by walking all of it.
    const listIndex = (article[0] as Record<string, number>).list0 + offset - 1;
    for (let i = 0; i < offset; i++) {
      payload.push({ next: i + 1 < offset ? i + 1 : listIndex, back: Math.max(0, i - 1), self: i });
    }
    for (const value of article.slice(1)) {
      payload.push(
        Array.isArray(value)
          ? value.map((i) => (i as number) + offset - 1)
          : isRecordLike(value)
            ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typeof v === "number" ? v + offset - 1 : v]))
            : value,
      );
    }
    const json = JSON.stringify(payload);
    assert.ok(json.length < 5 * 1024 * 1024, `payload is ${json.length} characters, over the cap`);
    const start = performance.now();
    const result = parseArticle(page(teaserBody, nuxt(payload)), TEASER_URL);
    assert.ok(performance.now() - start < 2000, `took ${Math.round(performance.now() - start)} ms`);
    assert.ok(
      result.success && /SENTINEL-LAST-PARAGRAPH/.test(result.article.textContent),
      "the walk never reached the article",
    );
  });

  it("doesn't run Paywall Hopper on an article recovered from the payload", async () => {
    let requests = 0;
    const server = createServer((_req, res) => {
      requests++;
      res.writeHead(200, { "content-type": "text/html" });
      res.end(teaser);
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    try {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/news/harbor-labs.html`;
      const result = await loadArticleFromUrl(url, "test", {
        skipPreCheck: false,
        enablePaywallHopper: true,
        showArticleImage: true,
      });
      assert.equal(result.status, "success");
      assert.equal(requests, 1, "Paywall Hopper refetched a page whose payload already held the article");
    } finally {
      server.close();
    }
  });

  const heapGrowthMB = (run: () => void) => {
    globalThis.gc?.();
    const before = process.memoryUsage().heapUsed;
    run();
    return (process.memoryUsage().heapUsed - before) / 1e6;
  };
  const opening = articleParagraphs[0];
  const openingText = "Harbor Labs, a maker of fictional sensor software, is being acquired by Example Corp.";

  it("bounds many distinct blocks that share one long string", () => {
    const long = `${openingText} ${"Shared text that many blocks point at, at length. ".repeat(450)}`;
    const payload: unknown[] = [{ list: 1 }, [], long];
    for (let i = 0; i < 6000; i++) (payload[1] as number[]).push(payload.push({ html: 2 }) - 1);
    const grew = heapGrowthMB(() =>
      parseArticle(page(`<article><p>${openingText}</p></article>`, nuxt(payload)), TEASER_URL),
    );
    assert.ok(grew < 40, `heap grew ${Math.round(grew)} MB`);
  });

  it("bounds a candidate's tag count, not just its length", () => {
    const list: [string, string][] = [...paragraphs(articleParagraphs), ["paragraph", "<b>x</b>".repeat(120_000)]];
    const grew = heapGrowthMB(() => parseArticle(page(teaserBody, nuxt(payloadWith(list))), TEASER_URL));
    assert.ok(grew < 40, `heap grew ${Math.round(grew)} MB`);
  });

  it("scores unclosed script tags in linear time", () => {
    const list = paragraphs([opening, "<script>".repeat(80_000), "x" + "<script>".repeat(80_000)]);
    const start = performance.now();
    parseArticle(page(teaserBody, nuxt(payloadWith(list))), TEASER_URL);
    assert.ok(performance.now() - start < 1500, `took ${Math.round(performance.now() - start)} ms`);
  });

  it("matches a teaser that cuts its paragraph off early", () => {
    const cut = `<article><h1>Example</h1><p>${openingText.slice(0, 60)}…</p><p>Subscribe to read more.</p></article>`;
    const result = parseArticle(page(cut), TEASER_URL);
    assert.ok(
      result.success && /SENTINEL-LAST-PARAGRAPH/.test(result.article.textContent),
      "the cut teaser wasn't matched",
    );
  });

  it("decodes entities before matching the page", () => {
    const encoded = articleParagraphs.map((p, i) =>
      i === 0 ? p.replace("Harbor Labs,", "Harbor &amp; Sons &ldquo;Labs&rdquo;,") : p,
    );
    const shown = `<article><p>${encoded[0].replace(/&nbsp;$/, "")}</p></article>`;
    const result = parseArticle(page(shown, nuxt(payloadWith(paragraphs(encoded)))), TEASER_URL);
    assert.ok(result.success && /SENTINEL-LAST-PARAGRAPH/.test(result.article.textContent), "entities broke the match");
    assert.match(result.article.textContent, /Harbor & Sons “Labs”/);
  });

  it("finds the article among many longer unrelated lists", () => {
    const unrelated = Array.from({ length: 6 }, (_, n) =>
      paragraphs(
        Array.from(
          { length: 12 },
          (_, i) => `Unrelated list ${n}, item ${i}: a story card about something else entirely.`,
        ),
      ),
    );
    const payload = payloadWith(...unrelated, paragraphs(articleParagraphs));
    const result = parseArticle(page(teaserBody, nuxt(payload)), TEASER_URL);
    assert.ok(
      result.success && /SENTINEL-LAST-PARAGRAPH/.test(result.article.textContent),
      "longer lists crowded out the article",
    );
  });

  it("doesn't let a comment quoting the article tie a comment list to the page", () => {
    const comments = paragraphs(
      Array.from({ length: 30 }, (_, i) =>
        i === 5
          ? `${openingText} — quoting the article, and I disagree with every word of it.`
          : `Comment ${i}: I have opinions about this acquisition, at length.`,
      ),
    );
    const result = parseArticle(page(fullArticle, nuxt(payloadWith(comments))), TEASER_URL);
    assert.ok(result.success);
    assert.match(result.article.textContent, /SENTINEL-LAST-PARAGRAPH/, "comments replaced the article");
  });

  it("doesn't count hidden text as what the page shows", () => {
    const card = (i: number) => `Hidden card ${i}: a recommended story about something else, at some length.`;
    const cards = paragraphs(Array.from({ length: 10 }, (_, i) => card(i)));
    const html = page(`<nav><a href="/">Home</a></nav><div hidden><p>${card(0)}</p></div>`, nuxt(payloadWith(cards)));
    assert.equal(parseArticle(html, TEASER_URL).success, false, "a hidden paragraph tied a payload list to the page");
  });

  it("measures how much of a long block the teaser shows", () => {
    const long = `${openingText} ${"The rest of a long opening paragraph that the teaser never shows. ".repeat(30)}`;
    const list = paragraphs([
      long,
      "A short second paragraph of the article.",
      "A short third paragraph of the article.",
    ]);
    const result = parseArticle(page(`<article><p>${openingText}…</p></article>`, nuxt(payloadWith(list))), TEASER_URL);
    assert.ok(result.success);
    assert.equal(
      result.article.recoveredFromPayload,
      true,
      "the teaser shows ~85 characters of a 2,000-character block",
    );
  });

  it("resolves lazy-loaded payload images", () => {
    const list: [string, string][] = [
      ...paragraphs(articleParagraphs.slice(0, 3)),
      ["image", '<figure><img src="data:image/gif;base64,R0lGOD" data-src="../media/lazy.png"></figure>'],
      ...paragraphs(articleParagraphs.slice(3)),
    ];
    const result = parseArticle(page(teaserBody, nuxt(payloadWith(list))), TEASER_URL);
    assert.ok(result.success);
    assert.match(result.article.content, /src="https:\/\/www\.example\.test\/news\/media\/lazy\.png"/);
  });

  const realArticle = (text: string) =>
    `<!doctype html><html><head><title>Real</title></head><body><article><h1>Real</h1><p>${text.repeat(60)}</p></article></body></html>`;

  /** Serves `first` to the first request and `rest` to every later one. */
  async function withServer(first: string, rest: string, run: (url: string) => Promise<void>) {
    let hits = 0;
    const server = createServer((_req, res) => {
      hits += 1;
      res.writeHead(200, { "content-type": "text/html" });
      res.end(hits === 1 ? first : rest);
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    try {
      await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}/news/harbor-labs.html`);
    } finally {
      await new Promise((done) => server.close(done));
    }
  }

  it("still checks a recovered article's own text for a paywall", async () => {
    const gated = teaser.replace(
      /SENTINEL-LAST-PARAGRAPH:[^"]*/,
      "Subscribe to continue reading the rest of this article.",
    );
    await withServer(
      gated,
      realArticle("This is the genuine article body with plenty of real reporting. "),
      async (url) => {
        const options = { skipPreCheck: false, enablePaywallHopper: true, showArticleImage: true };
        const result = await loadArticleFromUrl(url, "test", options);
        assert.ok(
          result.status === "success" && /genuine article body/.test(result.article.textContent),
          "the gated payload was shown",
        );
      },
    );
  });

  it("lets Paywall Hopper accept an article recovered from a payload", async () => {
    await withServer(teaser, realArticle("A different page the second method would return. "), async (url) => {
      const result = await loadArticleViaPaywallHopper(url, { showArticleImage: false });
      assert.ok(
        result.status === "success" && /SENTINEL-LAST-PARAGRAPH/.test(result.article.textContent),
        "the recovered teaser was rejected",
      );
    });
  });

  it("counts each block's wrapper against the tag budget", () => {
    const payload: unknown[] = [{ list: 1 }, [], `${openingText} ${"Opening paragraph text. ".repeat(30)}`, "x"];
    const list = payload[1] as number[];
    list.push(payload.push({ html: 2 }) - 1);
    for (let i = 0; i < 80_000; i++) list.push(payload.push({ html: 3 }) - 1);
    const page = `<!DOCTYPE html><html><body><article><p>${openingText}</p></article>${nuxt(payload)}</body></html>`;
    const grew = heapGrowthMB(() => parseArticle(page, TEASER_URL));
    assert.ok(grew < 40, `heap grew ${Math.round(grew)} MB`);
  });

  it("strips malformed markup in linear time", () => {
    const list = paragraphs([opening, "<".repeat(160_000), "x" + "<!--".repeat(40_000)]);
    const start = performance.now();
    parseArticle(page(teaserBody, nuxt(payloadWith(list))), TEASER_URL);
    assert.ok(performance.now() - start < 1500, `took ${Math.round(performance.now() - start)} ms`);
  });

  it("folds many lists of the same blocks into one candidate", () => {
    // Memory is asserted structurally: a heap reading here is dominated by the garbage from
    // parsing a 4 MB page, and swings by more than the difference being tested.
    const payload: unknown[] = [[], "paragraph"];
    // All five paragraphs: fewer would fall under the 500-character bar and never be a candidate.
    const blocks = articleParagraphs.map((p) => payload.push({ type: 1, html: payload.push(p) - 1 }) - 1);
    for (let i = 0; i < 250_000; i++) (payload[0] as number[]).push(payload.push(blocks) - 1);
    const { document } = parseHTML(`<!DOCTYPE html><html><body>${nuxt(payload)}</body></html>`);
    assert.equal(findPayloadArticles(document, TEASER_URL)?.candidates, 1);
  });

  it("doesn't let a comment list that opens by quoting the article replace it", () => {
    const comments = paragraphs([
      `${openingText} — quoting the article, and I disagree with every word of it.`,
      ...Array.from({ length: 30 }, (_, i) => `Comment ${i}: I have opinions about this acquisition, at length.`),
    ]);
    const result = parseArticle(page(fullArticle, nuxt(payloadWith(comments))), TEASER_URL);
    assert.ok(result.success);
    assert.match(result.article.textContent, /SENTINEL-LAST-PARAGRAPH/, "comments replaced the article");
  });

  it("doesn't count hidden text inside a visible element", () => {
    const card = (i: number) => `Hidden card ${i}: a recommended story about something else, at some length.`;
    const cards = paragraphs(Array.from({ length: 10 }, (_, i) => card(i)));
    for (const hidden of [
      `<blockquote><p hidden>${card(0)}</p></blockquote>`,
      `<div><template><p>${card(0)}</p></template></div>`,
    ]) {
      const html = page(`<nav><a href="/">Home</a></nav>${hidden}`, nuxt(payloadWith(cards)));
      assert.equal(parseArticle(html, TEASER_URL).success, false, `hidden text tied a list to the page: ${hidden}`);
    }
  });

  it("decodes accented named entities like the page does", () => {
    const renamed = articleParagraphs.map((p, i) => (i === 0 ? p.replace("Harbor Labs,", "Ren&eacute;e Labs,") : p));
    const shown = `<article><p>${renamed[0].replace(/&nbsp;$/, "")}</p></article>`;
    const result = parseArticle(page(shown, nuxt(payloadWith(paragraphs(renamed)))), TEASER_URL);
    assert.ok(result.success && /SENTINEL-LAST-PARAGRAPH/.test(result.article.textContent), "&eacute; broke the match");
  });

  it("reads the article from a Next.js payload, including results a data cache keeps as JSON text", () => {
    // The Atlantic: the page shows four paragraphs, and __NEXT_DATA__ holds every paragraph inside a
    // urql cache entry whose `data` is a JSON string.
    const blocks = articleParagraphs.map((html) => ({ __typename: "ArticleParagraphContent", innerHtml: html }));
    const data = JSON.stringify({ article: { content: blocks } });
    const next = JSON.stringify({ props: { pageProps: { urqlState: { "1781377907": { data } } } } });
    const shown = articleParagraphs
      .slice(0, 2)
      .map((p) => `<p>${p}</p>`)
      .join("");
    const html = page(
      `<article><h1>Example</h1>${shown}</article>`,
      `<script id="__NEXT_DATA__" type="application/json">${next.replace(/</g, "\\u003c")}</script>`,
    );
    const result = parseArticle(html, TEASER_URL);
    assert.ok(result.success);
    assert.match(result.article.textContent, /SENTINEL-LAST-PARAGRAPH/, "the last payload paragraph is missing");
    assert.equal(result.article.recoveredFromPayload, true);
  });

  const nextPage = (body: string, data: unknown) =>
    page(
      body,
      `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`,
    );
  const nextBlocks = (texts: string[]) => texts.map((text) => ({ text }));

  it("gives up on a Next.js payload with too many entries instead of exhausting the heap", () => {
    // Two million characters, under the size limit, but a million entries to flatten.
    const data = {
      props: { pageProps: { content: nextBlocks(articleParagraphs), unused: new Array(1_000_000).fill(0) } },
    };
    const { document } = parseHTML(nextPage(fullArticle, data));
    assert.equal(findPayloadArticles(document, TEASER_URL), null);
  });

  it("keeps a block whose text is JSON, like a code sample", () => {
    const code = '{"criticalExample":"JSON-CODE-SENTINEL","detail":"a code sample in the article"}';
    const data = {
      props: { pageProps: { content: [...nextBlocks(articleParagraphs), { type: "code", text: code }] } },
    };
    const shown = `<article><p>${articleParagraphs[0]}</p></article>`;
    const result = parseArticle(nextPage(shown, data), TEASER_URL);
    assert.ok(result.success && /JSON-CODE-SENTINEL/.test(result.article.textContent), "the code block was dropped");
  });

  it("doesn't let a comment that quotes a short article's opening replace it", () => {
    const article = articleParagraphs.slice(0, 3);
    const shown = `<article><h1>Example</h1>${article.map((p) => `<p>${p}</p>`).join("")}</article>`;
    const comments = [
      article[0],
      `COMMENT-SENTINEL ${"I have opinions about this acquisition and here they are at length. ".repeat(15)}`,
      `Another comment. ${"More opinions about the deal, the buyer, and the price. ".repeat(15)}`,
    ];
    const result = parseArticle(
      nextPage(shown, { props: { pageProps: { comments: nextBlocks(comments) } } }),
      TEASER_URL,
    );
    assert.ok(result.success);
    assert.doesNotMatch(result.article.textContent, /COMMENT-SENTINEL/, "comments replaced the article");
  });

  it("reads blocks under a __proto__ key", () => {
    const html = nextPage(
      fullArticle,
      JSON.parse(`{"__proto__":{"content":${JSON.stringify(nextBlocks(articleParagraphs))}}}`),
    );
    const { document } = parseHTML(html);
    assert.equal(findPayloadArticles(document, TEASER_URL)?.candidates, 1);
  });

  it(
    "reads the real Atlantic capture from its Next.js payload",
    { skip: !hasPrivateFixture("atlantic-teaser-tab.html") && "no private corpus" },
    () => {
      const url = "https://www.theatlantic.com/ideas/2026/10/katie-zacharia-press-secretary-trump/689055/";
      const result = parseArticle(loadPrivateFixture("atlantic-teaser-tab.html"), url);
      assert.ok(result.success);
      assert.match(
        result.article.textContent,
        /People who aren’t Donald Trump\./,
        "the article's last line is missing",
      );
      assert.equal(result.article.recoveredFromPayload, true);
    },
  );

  it(
    "reads the real bizjournals capture",
    { skip: !hasPrivateFixture("bizjournals-nuxt.html") && "no private corpus" },
    () => {
      const url = "https://www.bizjournals.com/portland/news/2026/10/13/c1-workday-acquisition.html?page=all";
      const result = parseArticle(loadPrivateFixture("bizjournals-nuxt.html"), url);
      assert.ok(result.success, "the captured page should parse from its payload");
      assert.match(result.article.textContent, /Paul Querna/, "a paragraph past the teaser is missing");
      assert.doesNotMatch(result.article.textContent, /RESERVED FOR SUBSCRIBERS/);
      assert.ok(result.article.textContent.length > 2500, `only ${result.article.textContent.length} characters`);
      assert.equal(result.article.recoveredFromPayload, true);
    },
  );
});

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("runExclusive", () => {
  it("ignores a second run while the first is in flight, and releases the lock however it ends", async () => {
    const lock = { current: false };
    let finishFirst!: () => void;
    const runs: string[] = [];
    const first = runExclusive(lock, () => {
      runs.push("first");
      return new Promise<void>((resolve) => (finishFirst = resolve));
    });
    const second = await runExclusive(lock, async () => {
      runs.push("second");
    });
    assert.equal(second, false, "a second press while a fetch runs must be ignored");
    finishFirst();
    assert.equal(await first, true);
    assert.equal(lock.current, false, "the lock must be released after the run");

    await assert.rejects(
      runExclusive(lock, async () => {
        throw new Error("fetch failed");
      }),
    );
    assert.equal(lock.current, false, "the lock must be released after a failure");
    assert.deepEqual(runs, ["first"]);
  });
});

describe("markdown articles", () => {
  const essay = loadFixture("markdown-essay.md");
  const page = loadFixture("markdown-alternate.html");

  it("recognizes a markdown response by content type, or a plain-text .md file", () => {
    const md = "# Title";
    assert.ok(isMarkdownResponse("text/markdown", "https://example.test/essay", md));
    assert.ok(isMarkdownResponse("text/markdown; charset=utf-8", "https://example.test/essay", md));
    assert.ok(isMarkdownResponse("text/x-markdown", "https://example.test/essay", md));
    assert.ok(isMarkdownResponse("text/plain", "https://example.test/essay.md", md));
    assert.ok(isMarkdownResponse(null, "https://example.test/notes.markdown?v=2", md));
    assert.ok(!isMarkdownResponse("text/html", "https://example.test/essay.md", md));
    assert.ok(!isMarkdownResponse("text/plain", "https://example.test/robots.txt", md));
  });

  it("never treats a full HTML document as markdown, whatever its headers say", () => {
    const shell =
      "<html><head><title>Login</title></head><body>" + "Login or subscribe. ".repeat(30) + "</body></html>";
    assert.ok(!isMarkdownResponse("text/plain", "https://example.test/alt.md", shell));
    assert.ok(!isMarkdownResponse("text/markdown", "https://example.test/alt.md", "\n<!DOCTYPE html><html>"));
    // HTML fragments inside markdown are fine.
    assert.ok(isMarkdownResponse("text/markdown", "https://example.test/a.md", '<p align="center">logo</p>\n\n# Hi'));
  });

  it("ignores markdown links in comments, scripts, and quoted attribute values", () => {
    const pageUrl = "https://example.test/";
    for (const head of [
      "<!-- <link rel=alternate type=text/markdown href=/wrong.md> -->",
      "<script>const x = `<link rel=alternate type=text/markdown href=/wrong.md>`</script>",
      '<link title=" rel=alternate type=text/markdown href=/wrong.md">',
    ]) {
      assert.equal(findMarkdownAlternate(`<html><head>${head}</head><body></body></html>`, pageUrl), null, head);
    }
  });

  it("decodes entities in the alternate's href and honors <base href>", () => {
    assert.equal(
      findMarkdownAlternate(
        '<link rel=alternate type=text/markdown href="/a.md?a=1&amp;b=2">',
        "https://example.test/",
      ),
      "https://example.test/a.md?a=1&b=2",
    );
    assert.equal(
      findMarkdownAlternate(
        '<base href="https://cdn.test/"><link rel=alternate type=text/markdown href="a.md">',
        "https://example.test/x/y",
      ),
      "https://cdn.test/a.md",
    );
  });

  it("finds the alternate past a '<body>' in a head script, and despite non-ASCII text before it", () => {
    const link = "<link rel=alternate type=text/markdown href=/essay.md>";
    for (const head of [
      `<script>const html = "<body>";</script>${link}`,
      `<!-- <body> example -->${link}`,
      `<title>İletişim İçin</title>${link}`,
    ]) {
      assert.equal(
        findMarkdownAlternate(`<head>${head}</head>`, "https://example.test/"),
        "https://example.test/essay.md",
        head,
      );
    }
  });

  it("recognizes an HTML shell that starts with a comment", () => {
    const shell =
      "<!-- cached page -->\n<!DOCTYPE html><html><head><title>Login</title></head><body>Login</body></html>";
    assert.ok(!isMarkdownResponse("text/plain", "https://example.test/alt.md", shell));
  });

  it("scans hostile input in linear time", () => {
    for (const run of [
      () => parseMarkdownArticle("[".repeat(166_000), "https://example.test/a.md"),
      () => parseMarkdownArticle("`".repeat(166_000), "https://example.test/a.md"),
      () => parseMarkdownArticle("[a](b)[c] ".repeat(16_000), "https://example.test/a.md"),
      () => findMarkdownAlternate("<link ".repeat(27_667), "https://example.test/"),
      () => findMarkdownAlternate("<script>".repeat(30_000), "https://example.test/"),
    ]) {
      const start = performance.now();
      run();
      assert.ok(performance.now() - start < 500, `${run} took ${Math.round(performance.now() - start)} ms`);
    }
  });

  it("finds a page's <link rel=alternate type=text/markdown>, whatever the attribute order", () => {
    assert.equal(
      findMarkdownAlternate(page, "https://example.test/essays/tidy"),
      "https://example.test/essays/essay.md",
    );
    assert.equal(
      findMarkdownAlternate(`<link rel='alternate' type='text/markdown' href='/a.md'>`, "https://example.test/x/y"),
      "https://example.test/a.md",
    );
    assert.equal(
      findMarkdownAlternate(`<link rel="alternate" type="application/rss+xml" href="/feed">`, "https://example.test/"),
      null,
    );
    assert.equal(
      findMarkdownAlternate(`<link rel="stylesheet" type="text/markdown" href="/a.md">`, "https://example.test/"),
      null,
    );
    assert.equal(
      findMarkdownAlternate(
        `<link rel="alternate" type="text/markdown" href="javascript:alert(1)">`,
        "https://example.test/",
      ),
      null,
    );
    assert.equal(findMarkdownAlternate("<p>no links</p>", "https://example.test/"), null);
  });

  it("takes the title from the first heading and drops it from the body", () => {
    const article = parseMarkdownArticle(essay, "https://example.test/essays/essay.md");
    assert.equal(article.title, "Networks Are Tidy");
    assert.doesNotMatch(article.body, /^# Networks Are Tidy/m);
    assert.match(article.body, /^## The Short Version/m);
  });

  it("takes the title from YAML front matter, and leaves the front matter out of the body", () => {
    const article = parseMarkdownArticle(
      '---\ntitle: "From Front Matter"\ndate: 2026-01-01\n---\n\nBody text.',
      "https://example.test/a.md",
    );
    assert.equal(article.title, "From Front Matter");
    assert.equal(article.body.trim(), "Body text.");
  });

  it("makes relative links and images absolute against the markdown's own URL", () => {
    const { body } = parseMarkdownArticle(essay, "https://example.test/essays/essay.md");
    assert.match(body, /\[web page\]\(https:\/\/example\.test\/essays\/index\.html\)/);
    assert.match(body, /\[appendix\]\(https:\/\/example\.test\/appendix#notes\)/);
    assert.match(body, /\[Wikipedia\]\(https:\/\/en\.wikipedia\.org\/wiki\/Neuron\)/);
    assert.match(body, /!\[\]\(https:\/\/example\.test\/essays\/figures\/city\.png\)/);
  });

  it("rewrites bracketed figure notes the way HTML articles are, so Raycast doesn't render them as math", () => {
    const { body } = parseMarkdownArticle(essay, "https://example.test/essays/essay.md");
    assert.match(body, /^\(Figure: A city vs\. a knot \(header animation\)\.\)$/m);
  });

  it("leaves brackets the author escaped as written", () => {
    const { body } = parseMarkdownArticle(
      "Intro.\n\nThe array is written \\[literal text\\] in the docs.",
      "https://example.test/a.md",
    );
    assert.match(body, /\\\[literal text\\\]/, "an escaped bracket was rewritten");
  });

  it("leaves fenced and inline code exactly as written", () => {
    const md = [
      "Intro.",
      "",
      "  ```",
      "  [aside] and [x](file.md)",
      "  ```",
      "",
      "````md",
      "```",
      "[still code](rel.md)",
      "```",
      "````",
      "",
      "Inline ``a ` [note] ` b`` and `[y](z.md)`.",
    ].join("\n");
    const { body } = parseMarkdownArticle(md, "https://example.test/docs/a.md");
    assert.equal(body, md);
  });

  it("keeps markdown brackets: nested labels, reference links, and brackets in a link's URL", () => {
    const base = "https://example.test/docs/a.md";
    assert.equal(
      parseMarkdownArticle("See [nested [label]](../b.md).", base).body,
      "See [nested [label]](https://example.test/b.md).",
    );
    assert.equal(
      parseMarkdownArticle("See [x](file.md?list=[a]).", base).body,
      "See [x](https://example.test/docs/file.md?list=[a]).",
    );
    assert.equal(
      parseMarkdownArticle("See [Text].\n\n[text]: ../b.md", base).body,
      "See [Text].\n\n[text]: https://example.test/b.md",
    );
    assert.equal(parseMarkdownArticle("- [ ] todo\n- [x] done", base).body, "- [ ] todo\n- [x] done");
  });

  it("doesn't resolve a link whose destination has markdown escapes", () => {
    assert.equal(parseMarkdownArticle("[x](foo\\(bar\\).md)", "https://test/docs/a.md").body, "[x](foo\\(bar\\).md)");
  });

  it("resolves relative URLs in embedded HTML", () => {
    const { body } = parseMarkdownArticle(
      '<a href="../b">link</a> <img src="../image.png" alt="hi">',
      "https://example.test/docs/a.md",
    );
    assert.equal(body, '<a href="https://example.test/b">link</a> <img src="https://example.test/image.png" alt="hi">');
  });

  it("reads YAML block-scalar and TOML front matter titles, and '# C#' headings", () => {
    const base = "https://example.test/a.md";
    assert.equal(
      parseMarkdownArticle("---\ntitle: >-\n  Multiline\n  title\n---\nBody", base).title,
      "Multiline title",
    );
    const toml = parseMarkdownArticle('+++\ntitle = "Hugo"\n+++\nBody', base);
    assert.deepEqual([toml.title, toml.body], ["Hugo", "Body"]);
    assert.equal(parseMarkdownArticle("# C#\n\nBody", base).title, "C#");
    assert.equal(parseMarkdownArticle("# Closed ##\n\nBody", base).title, "Closed");
  });

  it("keeps code in the summarizer's text, and drops scripts and HTML tags", () => {
    const { textContent } = parseMarkdownArticle(
      "```\nif (a < b && c > d) return x_y;\n```\n\n<script>window.secret = 42;</script><p>Hello &amp; world</p>",
      "https://example.test/a.md",
    );
    assert.match(textContent, /if \(a < b && c > d\) return x_y;/);
    assert.match(textContent, /Hello & world/);
    assert.doesNotMatch(textContent, /secret|<p>/);
  });

  it("keeps HTML-looking inline code as text, and decodes common entities", () => {
    const { textContent } = parseMarkdownArticle(
      "Use `<script>` tags carefully. İstanbul <script>alert(1)</script> Costs &pound;10 &mdash; a bargain &copy; 2026.",
      "https://example.test/a.md",
    );
    assert.equal(textContent, "Use <script> tags carefully. İstanbul  Costs £10 — a bargain © 2026.");
  });

  it("gives the summarizer plain text, without markdown syntax or URLs", () => {
    const { textContent } = parseMarkdownArticle(essay, "https://example.test/essays/essay.md");
    assert.match(textContent, /The first approach is rapid normal science/);
    assert.doesNotMatch(textContent, /\*\*|##|\]\(|https:\/\//);
  });

  // Shaped like Cloudflare's conversion of a whole page for `Accept: text/markdown`, captured
  // 2026-10-26 from blog.cloudflare.com and developers.cloudflare.com: the page around the
  // article comes along with it.
  const chromed = [
    "---",
    "title: Networks Are Tidy",
    "---",
    "",
    "[Skip to content](#main-content)",
    "",
    "> Documentation Index  ",
    "> Fetch the complete documentation index at: https://example.test/llms.txt",
    "",
    "[Example Lab](https://example.test/)",
    "",
    "[Example Lab](https://example.test/)",
    "",
    essay,
    "",
    "LightDark",
    "",
    "## On this page",
    "",
    "[![](https://example.test/logo.svg)Docs](/)",
    "",
    "```json",
    '{"@context":"https://schema.org","@type":"BlogPosting","headline":"Networks Are Tidy"}',
    "```",
    "",
  ].join("\n");

  const jsonLd = '{"@context":"https://schema.org","@type":"BlogPosting","headline":"Networks Are Tidy"}';
  const chromedPage = page.replace("</head>", `<script type="application/ld+json">${jsonLd}</script></head>`);

  it("removes the page around the article from a converted page", () => {
    const stripped = stripPageChrome(chromed, "https://example.test/essays/tidy", chromedPage);
    assert.match(stripped, /^## The Short Version/m);
    assert.match(stripped, /^## Details/m);
    for (const chrome of [/Skip to content/, /llms\.txt/, /\]\(https:\/\/example\.test\/\)/, /LightDark/]) {
      assert.doesNotMatch(stripped, chrome);
    }
    assert.doesNotMatch(stripped, /@context/);
    assert.doesNotMatch(stripped, /On this page/);
    assert.doesNotMatch(stripped, /logo\.svg/);
  });

  it("keeps lines that only look like page chrome", () => {
    const article = [
      "# Title",
      "",
      "[The appendix](https://example.test/appendix)",
      "",
      "> A quotation from the paper.",
      "",
      "Dark light, the poet wrote, is still light.",
      "",
      "[Example Lab](https://example.test/)",
      "",
      "> Agents read llms.txt before the page itself.",
      "",
      "```json",
      '{"@context":"https://schema.org","@type":"Article","headline":"An example of JSON-LD"}',
      "```",
      "",
      "```md",
      "[Skip to content](#main-content)",
      "LightDark",
      "```",
      "",
      "```json",
      '{"name":"reader","version":"1.0.0"}',
      "```",
      "",
      "## Last section",
      "",
      "Closing words.",
    ].join("\n");
    assert.equal(stripPageChrome(article, "https://example.test/post"), article);
  });

  it("removes a docs feedback widget from the end of a converted page", () => {
    // As developers.cloudflare.com pages end, 2026-10-27.
    const page = "# Tiered Cache\n\nThe article.\n\nWas this helpful?\n\nYesNo\n";
    assert.equal(stripPageChrome(page, "https://example.test/post"), "# Tiered Cache\n\nThe article.\n");
    const asked = "# FAQ\n\nWas this helpful?\n\nIt was, and here is why.";
    assert.equal(stripPageChrome(asked, "https://example.test/post"), asked);
  });

  it("keeps a closing JSON-LD example that isn't the page's own", () => {
    const tutorial = [
      "# Structured data",
      "",
      "Add this to the page:",
      "",
      "```json",
      '{"@context":"https://schema.org","@type":"Recipe","name":"Soup"}',
      "```",
    ].join("\n");
    assert.equal(stripPageChrome(tutorial, "https://example.test/post", chromedPage), tutorial);
    assert.equal(stripPageChrome(tutorial, "https://example.test/post"), tutorial);
  });

  it("resolves a reference definition whose URL is on the next line", () => {
    const { body } = parseMarkdownArticle("See the [guide][g].\n\n[g]:\n  ../guide", "https://example.test/docs/a.md");
    assert.match(body, /^ {2}https:\/\/example\.test\/guide$/m);
  });

  it("leaves a code block that runs to the end alone", () => {
    const article = "Install it:\n\n```sh\nnpm install\n# done";
    assert.equal(stripPageChrome(article, "https://example.test/post"), article);
  });

  it("keeps code fenced with Windows line endings out of the prose rewrites", () => {
    const { body } = parseMarkdownArticle(
      "Intro.\r\n\r\n```md\r\n[Figure: kept]\r\n```\r\n",
      "https://example.test/a.md",
    );
    assert.match(body, /\[Figure: kept\]/);
  });

  describe("cutting a converted page down to the article Readability found", () => {
    // Sized like the real pages: the chrome is a small share of the whole.
    const paragraphs = Array.from(
      { length: 12 },
      (_, i) =>
        `Paragraph ${i + 1} of the article explains how a cache serves part of a large file when a video player seeks.`,
    );
    const footer = [
      "## Subscribe to receive notifications of new posts",
      "",
      "Email address",
      "",
      "We'll never share your email address.",
      "",
      '- <a href="https://example.test/de-de/">Deutsch</a>',
      '- <a href="https://example.test/fr-fr/">Français</a>',
    ];

    it("cuts the page around the article when Readability found all of it", () => {
      const markdown = [
        "Last updated Oct 8, 2026 | Copy as Markdown | [View as Markdown](https://example.test/index.md)",
        "",
        ...paragraphs.flatMap((p) => [p, ""]),
        ...footer,
      ].join("\n");
      const trimmed = trimToArticle(markdown, paragraphs.join("\n\n"));
      for (const p of paragraphs) assert.ok(trimmed.includes(p), p);
      assert.doesNotMatch(trimmed, /Copy as Markdown|Subscribe|Email address|Deutsch/);
    });

    it("never cuts inside a code block", () => {
      const markdown = [
        ...paragraphs.flatMap((p) => [p, ""]),
        "```bash",
        'curl "https://api.example.test/zones/$ZONE/cache" \\',
        "\t--json '{",
        '\t\t"region": "us-east-1"',
        "\t}'",
        "```",
        "",
        "Was this helpful?",
        "",
        "YesNo",
      ].join("\n");
      const article = `${paragraphs.join("\n\n")}\ncurl "https://api.example.test/zones/$ZONE/cache" \\\n--json '{"region": "us-east-1"}'`;
      const trimmed = trimToArticle(markdown, article);
      assert.match(trimmed, /"region": "us-east-1"\n\t\}'\n```/);
      assert.doesNotMatch(trimmed, /Was this helpful/);
    });

    it("keeps a short closing code block and a closing diagram", () => {
      const markdown = [
        ...paragraphs.flatMap((p) => [p, ""]),
        "To install:",
        "",
        "```sh",
        "npm install",
        "```",
        "",
        "![](figures/diagram.svg)",
        "",
        ...footer,
      ].join("\n");
      const articleText = `${paragraphs.join("\n\n")}\nTo install:\nnpm install`;
      const articleHtml = `${paragraphs.map((p) => `<p>${p}</p>`).join("")}<p>To install:</p><pre>npm install</pre><img src="https://example.test/figures/diagram.svg">`;
      const trimmed = trimToArticle(markdown, articleText, articleHtml);
      assert.match(trimmed, /```sh\nnpm install\n```/);
      assert.match(trimmed, /diagram\.svg/);
      assert.doesNotMatch(trimmed, /Email address/);
    });

    it("keeps a section Readability left out of its article", () => {
      const callout =
        "Custom settings take precedence over the hints. If you have configured your own topology, the hint will not override it, and requests keep following the path you set.";
      const markdown = [...paragraphs.flatMap((p) => [p, ""]), callout, "", ...footer].join("\n");
      const trimmed = trimToArticle(markdown, paragraphs.join("\n\n"));
      assert.ok(trimmed.includes(callout));
    });

    it("still cuts a footer list whose short items add up to a paragraph's worth of letters", () => {
      // As blog.cloudflare.com's language picker ends a converted post, 2026-10-27.
      const languages = [
        "English",
        "Deutsch",
        "Español",
        "Español (Latinoamérica)",
        "Français",
        "Italiano",
        "日本語",
        "한국어",
        "繁體中文",
        "简体中文",
        "Português",
        "Русский",
        "Bahasa Indonesia",
        "ภาษาไทย",
        "Tiếng Việt",
        "Polski",
        "العربية",
        "עברית",
        "Svenska",
        "Nederlands",
        "Türkçe",
      ];
      const markdown = [
        ...paragraphs.flatMap((p) => [p, ""]),
        "<details>",
        "",
        "<summary>",
        "",
        "English",
        "",
        "</summary>",
        "",
        ...languages.map((l) => `- <a href="https://example.test/${l}/">${l}</a>`),
        "</details>",
      ].join("\n");
      const trimmed = trimToArticle(markdown, paragraphs.join("\n\n"));
      assert.doesNotMatch(trimmed, /Deutsch|<details>/);
    });

    it("keeps closing images that have alt text or are written as references", () => {
      const markdown = [
        ...paragraphs.flatMap((p) => [p, ""]),
        "![Architecture diagram](figures/diagram.svg)",
        "",
        "![Request flow][flow]",
        "",
        "![sequence]",
        "",
        "Was this helpful?",
        "",
        "[flow]: figures/flow.png",
        "[sequence]: figures/sequence.png",
      ].join("\n");
      const articleHtml = `${paragraphs.map((p) => `<p>${p}</p>`).join("")}<img src="https://example.test/figures/diagram.svg"><img src="https://example.test/figures/flow.png"><img src="https://example.test/figures/sequence.png">`;
      const trimmed = trimToArticle(markdown, paragraphs.join("\n\n"), articleHtml);
      assert.match(trimmed, /diagram\.svg/);
      assert.match(trimmed, /!\[Request flow\]\[flow\]/);
      assert.match(trimmed, /^!\[sequence\]$/m);
      assert.doesNotMatch(trimmed, /Was this helpful/);
    });

    it("keeps an article's short last lines and its reference definitions", () => {
      const markdown = [
        ...paragraphs.flatMap((p) => [p, ""]),
        "See the [docs][ref] and [more][ref2].",
        "",
        "## Requirements",
        "",
        "- macOS 14+",
        "- Raycast",
        "",
        ...footer,
        "",
        "[ref]: https://example.test/docs",
        "[ref2]:",
        "  https://example.test/more",
      ].join("\n");
      const article = `${paragraphs.join("\n\n")}\nSee the docs and more.\nRequirements\nmacOS 14+\nRaycast`;
      const trimmed = trimToArticle(markdown, article);
      assert.match(trimmed, /- Raycast/);
      assert.match(trimmed, /^\[ref\]: https:\/\/example\.test\/docs$/m);
      assert.match(trimmed, /^\[ref2\]:\n {2}https:\/\/example\.test\/more$/m);
      assert.doesNotMatch(trimmed, /Email address|Deutsch/);
    });

    it("keeps everything when Readability found only part of the page", () => {
      const markdown = [
        ...paragraphs.flatMap((p) => [p, ""]),
        ...footer,
        "",
        "## Payment options",
        "",
        "Accept payments online with a prebuilt form or build your own.",
      ].join("\n");
      assert.equal(trimToArticle(markdown, paragraphs[0]), markdown);
    });
  });

  describe("choosing between a page's markdown and its HTML", () => {
    const url = "https://example.test/essays/tidy";
    const prose = (count: number, marker: string) =>
      Array.from(
        { length: count },
        (_, i) =>
          `${marker} paragraph ${i + 1} carries enough ordinary prose about networks, neurons, and their building blocks for Readability to keep it.`,
      );
    const htmlPage = (paragraphs: string[]) =>
      "<!doctype html><html><head><title>Networks Are Tidy</title></head><body><main><article>" +
      `<h1>Networks Are Tidy</h1>${paragraphs.map((p) => `<p>${p}</p>`).join("")}</article></main></body></html>`;
    const pageOf = (html: string) => {
      const parsed = parseArticle(html, url, { skipPreCheck: true, forceParse: true });
      assert.ok(parsed.success);
      return { article: parsed.article, html };
    };
    const markdownOf = (text: string) => parseMarkdownArticle(text, url);
    const teaserHtml = loadFixture("paywalled-vanityfair-style.html").replace(
      /<p>\s*The opening[\s\S]*?<\/p>/,
      `<p>${prose(2, "HTML teaser").join(" ")}</p>`,
    );

    for (const [label, markdown, html, useMarkdown, reason] of [
      ["markdown with almost no text", "# Tidy\n\nShort.", null, false, "too-short"],
      [
        "markdown that says it is withholding the story",
        `# Tidy\n\n${prose(3, "Teaser").join("\n\n")}\n\nSubscribe to continue reading. Already a subscriber? Sign in.`,
        null,
        false,
        "paywalled",
      ],
      ["markdown when the HTML is unavailable", essay, null, true, "no-html"],
      [
        "a long markdown teaser padded with page chrome that says it is withholding the story",
        `# Tidy\n\n${prose(2, "Teaser").join("\n\n")}\n\nSubscribe to continue reading. Already a subscriber? Sign in.\n\n${prose(16, "Footer link").join("\n\n")}`,
        null,
        false,
        "paywalled",
      ],
      [
        "a full markdown article that mentions unlimited access, as a pricing page does",
        `# Plans\n\n${prose(16, "Pricing").join("\n\n")}\n\nThe Pro plan gives you unlimited access to every feature for $20 a month.`,
        null,
        true,
        "no-html",
      ],
      [
        "markdown whose code example mentions unlimited access",
        `${essay}\n\n\`\`\`json\n{"plan": "Unlimited access", "price": 20}\n\`\`\`\n`,
        null,
        true,
        "no-html",
      ],
      [
        "markdown with a component written on one line",
        `${essay}\n\n<Note>Restart the application after changing this setting.</Note>\n`,
        htmlPage(prose(2, "HTML")),
        false,
        "components",
      ],
      [
        "markdown full of unrendered components",
        `${essay}\n\n<Steps>\n  <Step title="Read">\n    Read the essay.\n  </Step>\n</Steps>\n`,
        htmlPage(prose(2, "HTML")),
        false,
        "components",
      ],
      [
        "markdown with components written inline",
        `${essay}\n\n<Card title="Setup">Install it first.</Card>\n<Card\n  title="Use"\n/>\n`,
        htmlPage(prose(2, "HTML")),
        false,
        "components",
      ],
      [
        "markdown holding part of the article",
        `# Tidy\n\n${prose(2, "Markdown").join("\n\n")}`,
        htmlPage(prose(12, "HTML")),
        false,
        "partial",
      ],
      [
        "markdown of any length when the HTML is paywalled, since it may be the teaser and the page's chrome",
        `# Tidy\n\n${prose(8, "Markdown").join("\n\n")}`,
        teaserHtml,
        false,
        "html-paywalled",
      ],
      ["markdown as complete as the HTML", essay, page, true, "markdown"],
    ] as const) {
      it(`${useMarkdown ? "takes" : "passes over"} ${label}`, () => {
        const verdict = judgeMarkdown(markdownOf(markdown), html === null ? null : pageOf(html), url);
        assert.deepEqual(verdict, { useMarkdown, reason });
      });
    }
  });

  describe("loading", () => {
    let base = "";
    let server: ReturnType<typeof createServer>;
    const send = (res: import("node:http").ServerResponse, status: number, type: string, body: string) => {
      res.writeHead(status, { "Content-Type": type });
      res.end(body);
    };

    const plainPage = page.replace(/<link[^>]*text\/markdown[^>]*>/, "");
    const longPage = plainPage.replace(
      /<main>[\s\S]*<\/main>/,
      `<main><article><h1>Networks Are Tidy</h1>${"<p>This HTML body is the whole article, long enough that a short markdown version is plainly part of it.</p>".repeat(12)}</article></main>`,
    );
    const teaserPage = loadFixture("paywalled-vanityfair-style.html").replace(
      /<p>\s*The opening[\s\S]*?<\/p>/,
      `<p>${"This HTML teaser opens the story and stops where the barrier begins, as metered pages do. ".repeat(3)}</p>`,
    );
    /** `html` with its markdown link, if any, pointing at /alt/<name>.md. */
    const linking = (html: string, name: string) =>
      html
        .replace(/<link[^>]*text\/markdown[^>]*>/, "")
        .replace("</head>", `<link rel="alternate" type="text/markdown" href="/alt/${name}.md"></head>`);
    const excerpt = `# Networks Are Tidy\n\n${"A markdown excerpt that stops early. ".repeat(8)}`;
    type Reply = [status: number, type: string, body: string, location?: string];
    const md = (body: string): Reply => [200, "text/markdown", body];
    const htmlReply = (body: string): Reply => [200, "text/html; charset=utf-8", body];
    const negotiated: Record<string, (wantsMarkdown: boolean, userAgent: string) => Reply> = {
      "/negotiated/full": (m) =>
        m ? md(chromed) : htmlReply(chromedPage.replace(/<link[^>]*text\/markdown[^>]*>/, "")),
      "/negotiated/old.md": () => [301, "text/plain", "", "/negotiated/partial"],
      "/negotiated/partial": (m) => (m ? md(excerpt) : htmlReply(longPage)),
      "/negotiated/components": (m) =>
        m
          ? md(`${essay}\n\n<Steps>\n  <Step title="Read">\n    Read the essay.\n  </Step>\n</Steps>\n`)
          : htmlReply(plainPage),
      "/negotiated/html-fails": (m) => (m ? md(essay) : [500, "text/plain", "server error"]),
      "/negotiated/second-md": (m) => md(m ? "" : essay),
      "/negotiated/strict": (m) => (m ? [406, "text/plain", "not acceptable"] : htmlReply(plainPage)),
      "/negotiated/redirect": (m) => (m ? [302, "text/plain", "", "/negotiated/redirect.md"] : htmlReply(longPage)),
      "/negotiated/redirect.md": () => md(excerpt),
      "/negotiated/alternate": (m) =>
        m
          ? md(`${essay}\n\n<Steps>\n  <Step title="Read">\n    Read the essay.\n  </Step>\n</Steps>\n`)
          : htmlReply(page.replace('href="essay.md"', 'href="/negotiated/essay.md"')),
      "/negotiated/essay.md": () => md(essay),
      "/negotiated/bad-json-ld": (m) =>
        m
          ? md(essay)
          : htmlReply(
              '<html><head><title>Tidy</title><script type="application/ld+json">[null,{"@type":"Article"}]</script></head><body><p>Hi.</p></body></html>',
            ),
      "/negotiated/challenge": (m) =>
        m
          ? md(essay)
          : htmlReply(
              "<html><head><title>Just a moment...</title></head><body><p>Checking your browser.</p></body></html>",
            ),
      "/alt/components": () => htmlReply(linking(page, "components")),
      "/alt/components.md": () =>
        md(`${essay}\n\n<Steps>\n  <Step title="Read">\n    Read the essay.\n  </Step>\n</Steps>\n`),
      "/alt/partial": () => htmlReply(linking(longPage, "partial")),
      "/alt/partial.md": () => md(excerpt),
      "/alt/unreadable": () =>
        htmlReply(linking(page, "unreadable").replace(/<main>[\s\S]*<\/main>/, "<main><p>Hi.</p></main>")),
      "/alt/unreadable.md": () => md(essay),
      "/alt/chromed": () => htmlReply(linking(chromedPage, "chromed")),
      "/alt/chromed.md": () => md(chromed),
      "/alt/paywalled-full": () => htmlReply(linking(teaserPage, "paywalled-full")),
      "/alt/paywalled-full.md": () => md(essay),
      "/alt/paywalled-teaser": () => htmlReply(linking(teaserPage, "paywalled-teaser")),
      // Googlebot, the Paywall Hopper's first method, gets a partial article without the barrier.
      "/alt/hopper-short": (_m, ua) =>
        htmlReply(
          /Googlebot/.test(ua)
            ? plainPage.replace(
                /<main>[\s\S]*<\/main>/,
                `<main><article><h1>Networks Are Tidy</h1>${"<p>This crawler copy holds a little more of the story than the teaser, then stops short.</p>".repeat(5)}</article></main>`,
              )
            : linking(teaserPage, "hopper-short"),
        ),
      "/alt/hopper-short.md": () =>
        md(`${essay}\n\n${"The full article goes on for many more paragraphs than any partial copy. ".repeat(30)}`),
      "/negotiated/huge": (m) =>
        m
          ? md(essay)
          : htmlReply(
              plainPage.replace(
                /<main>[\s\S]*<\/main>/,
                "<p>This HTML body paragraph is long enough to count as article prose when Readability checks it.</p>".repeat(
                  21_000,
                ),
              ),
            ),
      "/alt/paywalled-teaser.md": () =>
        md(`# Networks Are Tidy\n\n${"A markdown teaser opens the story and stops at the barrier. ".repeat(5)}`),
    };
    const accepts: { path: string; accept: string }[] = [];

    // Routes: /essay.md is markdown; /post advertises it. Under /broken/ the alternate 404s,
    // and under /spa/ it answers with an HTML app shell, as a catch-all route would.
    const ready = new Promise<void>((resolve) => {
      server = createServer((req, res) => {
        const path = req.url ?? "/";
        const route = negotiated[path];
        if (route) {
          const accept = req.headers.accept ?? "";
          accepts.push({ path, accept });
          const [status, type, body, location] = route(/^text\/markdown/.test(accept), req.headers["user-agent"] ?? "");
          if (location) res.setHeader("Location", location);
          return send(res, status, type, body);
        }
        if (path === "/home-link.md") return send(res, 200, "text/markdown", `${essay}\n\n[Example Lab](/)\n`);
        if (path === "/essay.md") return send(res, 200, "text/markdown; charset=utf-8", essay);
        if (path === "/spa/essay.md")
          return send(res, 200, "text/html", "<html><body><div id=app></div></body></html>");
        if (path === "/shell/essay.md") {
          return send(
            res,
            200,
            "text/plain",
            "<html><head><title>Login</title></head><body>" + "Login or subscribe. ".repeat(30) + "</body></html>",
          );
        }
        if (path === "/heading/essay.md") return send(res, 200, "text/markdown", "# " + "A".repeat(220));
        if (path === "/encoded/post")
          return send(res, 200, "text/html", page.replace('href="essay.md"', 'href="bad%FF.md"'));
        if (path === "/encoded/bad%FF.md") return send(res, 200, "text/markdown", essay.replace(/^# .*\n/, ""));
        if (path === "/headless/post") {
          return send(res, 200, "text/html", page.replace(/<\/head>[\s\S]*/, "<p>Text</p>".repeat(100_000)));
        }
        if (path === "/headless/essay.md") return send(res, 200, "text/markdown", essay);
        if (path.endsWith("/post")) return send(res, 200, "text/html; charset=utf-8", page);
        send(res, 404, "text/plain", "not found");
      });
      server.listen(0, "127.0.0.1", () => {
        base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        resolve();
      });
    });
    const options = { skipPreCheck: false, enablePaywallHopper: false, showArticleImage: true };

    it("opens a markdown URL directly instead of parsing it as HTML", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/essay.md`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status !== "success") return;
      assert.equal(result.article.title, "Networks Are Tidy");
      assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
      assert.match(result.article.textContent, /legible building blocks/);
    });

    it("prefers a page's markdown alternate, keeping the page's title, site name, and image", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/post`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status !== "success") return;
      assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
      assert.doesNotMatch(result.article.bodyMarkdown, /This HTML body/);
      assert.equal(result.article.title, "Networks Are Tidy");
      assert.equal(result.article.siteName, "Example Lab");
      assert.ok(result.article.bodyMarkdown.startsWith("![](https://example.test/og.png)"));
      assert.equal(result.article.url, `${base}/post`);
    });

    it("titles an untitled markdown file by its name, even when the name isn't valid percent-encoding", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/encoded/post`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
    });

    it("reads only the <head> of a page that never closes it, so a long page's DOM is never built", async () => {
      await ready;
      (globalThis as { gc?: () => void }).gc?.();
      const before = process.memoryUsage().heapUsed;
      let peak = before;
      const timer = setInterval(() => (peak = Math.max(peak, process.memoryUsage().heapUsed)), 1);
      const result = await loadArticleFromUrl(`${base}/headless/post`, "test", options);
      clearInterval(timer);
      peak = Math.max(peak, process.memoryUsage().heapUsed);
      assert.equal(result.status, "success", JSON.stringify(result).slice(0, 300));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
      assert.ok(peak - before < 40e6, `heap grew ${Math.round((peak - before) / 1e6)} MB`);
    });

    for (const [label, path] of [
      ["is missing", "/broken/post"],
      ["answers with HTML", "/spa/post"],
      ["is an HTML page served as text/plain", "/shell/post"],
      ["has no text once its title is taken", "/heading/post"],
    ] as const) {
      it(`falls back to the HTML article when the markdown alternate ${label}`, async () => {
        await ready;
        const result = await loadArticleFromUrl(`${base}${path}`, "test", { ...options, skipPreCheck: true });
        assert.equal(result.status, "success", JSON.stringify(result));
        if (result.status !== "success") return;
        assert.match(result.article.bodyMarkdown, /This HTML body/);
      });
    }

    it("asks for markdown first, then fetches the HTML to compare it with", async () => {
      await ready;
      accepts.length = 0;
      const result = await loadArticleFromUrl(`${base}/negotiated/full`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status !== "success") return;
      assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
      assert.doesNotMatch(result.article.bodyMarkdown, /This HTML body|Skip to content|LightDark|@context|llms\.txt/);
      assert.equal(result.article.title, "Networks Are Tidy");
      assert.equal(result.article.siteName, "Example Lab");
      assert.equal(accepts.length, 2, JSON.stringify(accepts));
      assert.match(accepts[0].accept, /^text\/markdown,/);
      assert.doesNotMatch(accepts[1].accept, /markdown/);
    });

    for (const [label, path] of [
      ["holds only part of the article", "/negotiated/partial"],
      ["is full of components Raycast can't render", "/negotiated/components"],
    ] as const) {
      it(`shows the HTML article when the page's markdown ${label}`, async () => {
        await ready;
        const result = await loadArticleFromUrl(`${base}${path}`, "test", options);
        assert.equal(result.status, "success", JSON.stringify(result));
        if (result.status === "success") assert.match(result.article.bodyMarkdown, /This HTML body/);
      });
    }

    it("shows the markdown when the HTML can't be fetched to compare", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/negotiated/html-fails`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
    });

    it("leaves a markdown file as its author wrote it", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/home-link.md`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /\[Example Lab\]/);
    });

    it("reads a page that answers the request for HTML with markdown too, using that second response", async () => {
      await ready;
      accepts.length = 0;
      const result = await loadArticleFromUrl(`${base}/negotiated/second-md`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
      assert.equal(accepts.length, 2, "one fetch asks for markdown, one for HTML; both get markdown");
    });

    it("asks again for HTML when a site refuses the request for markdown", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/negotiated/strict`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /This HTML body/);
    });

    it("compares markdown it was redirected to with the page, as for any other markdown it asked for", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/negotiated/redirect`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /This HTML body/);
    });

    it("compares the markdown when an old .md link redirects to the page", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/negotiated/old.md`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /This HTML body/);
    });

    it("judges the markdown a page sent, instead of reading the markdown version it links to unchecked", async () => {
      await ready;
      accepts.length = 0;
      const result = await loadArticleFromUrl(`${base}/negotiated/alternate`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /This HTML body/);
      assert.ok(!accepts.some((a) => a.path === "/negotiated/essay.md"), JSON.stringify(accepts));
    });

    it("shows the markdown when the page's JSON-LD is malformed", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/negotiated/bad-json-ld`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
    });

    it("titles the markdown from the markdown when the page it came with isn't the article", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/negotiated/challenge`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.equal(result.article.title, "Networks Are Tidy");
    });

    for (const [label, path] of [
      ["is full of components Raycast can't render", "/alt/components"],
      ["holds only part of the article", "/alt/partial"],
    ] as const) {
      it(`shows the HTML article when the markdown version a page links to ${label}`, async () => {
        await ready;
        const result = await loadArticleFromUrl(`${base}${path}`, "test", options);
        assert.equal(result.status, "success", JSON.stringify(result));
        if (result.status === "success") assert.match(result.article.bodyMarkdown, /This HTML body/);
      });
    }

    it("names the article from the page's <head> when the page links its markdown version but can't be parsed", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/alt/unreadable`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status !== "success") return;
      assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
      assert.equal(result.article.siteName, "Example Lab");
    });

    it("removes a converter's page chrome from the markdown version a page links to", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/alt/chromed`, "test", options);
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status !== "success") return;
      assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
      assert.doesNotMatch(result.article.bodyMarkdown, /This HTML body|Skip to content|LightDark|@context|llms\.txt/);
      assert.equal(result.article.siteName, "Example Lab");
    });

    it("shows a paywalled page's markdown version when it holds more than the teaser", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/alt/paywalled-full`, "test", { ...options, skipPreCheck: true });
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
    });

    it("shows a paywalled page's HTML teaser when its markdown version is no longer", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/alt/paywalled-teaser`, "test", {
        ...options,
        skipPreCheck: true,
      });
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status !== "success") return;
      assert.match(result.article.bodyMarkdown, /This HTML teaser/);
      assert.doesNotMatch(result.article.bodyMarkdown, /markdown teaser/);
    });

    it("shows a paywalled page's markdown version over a shorter copy the Paywall Hopper found", async () => {
      await ready;
      const result = await loadArticleFromUrl(`${base}/alt/hopper-short`, "test", {
        ...options,
        skipPreCheck: true,
        enablePaywallHopper: true,
      });
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /many more paragraphs/);
    });

    it("doesn't parse a page too large to compare with the markdown it sent", async () => {
      await ready;
      // skipPreCheck: the repeated paragraphs would fail Readability's precheck, which isn't the guard under test.
      const result = await loadArticleFromUrl(`${base}/negotiated/huge`, "test", { ...options, skipPreCheck: true });
      assert.equal(result.status, "success", JSON.stringify(result));
      if (result.status === "success") assert.match(result.article.bodyMarkdown, /^## The Short Version/m);
    });

    it("closes the server", async () => {
      await ready;
      await new Promise((resolve) => server.close(resolve));
    });
  });
});
