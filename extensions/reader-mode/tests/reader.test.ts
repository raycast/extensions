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
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tryBypassPaywall } from "../src/utils/paywall-hopper";
import { loadArticleViaPaywallHopper } from "../src/utils/article-loader";
import {
  fetchHtmlAsGooglebot,
  fetchHtmlAsBingbot,
  GOOGLEBOT_USER_AGENT,
  BINGBOT_USER_AGENT,
} from "../src/utils/fetcher";

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
});
