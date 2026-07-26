import test from "node:test";
import assert from "node:assert/strict";
import { convertWebpageToMarkdown } from "../src/lib/convert";
import type { CommandPreferences } from "../src/lib/types";

const SHORT_PAGE_URL = "https://example.com/short";
const FALLBACK_PREFIX = "https://reader.test/";
const FALLBACK_URL = `${FALLBACK_PREFIX}${SHORT_PAGE_URL}`;

// Local extraction succeeds here but yields ~105 characters, which is under the
// 200-character "looks thin" threshold that triggers the external fallback.
const SHORT_PAGE_HTML = `<!doctype html><html><head><title>Short Note</title></head><body>
<article><h1>Short Note</h1><p class="byline">By Jane Doe</p><p>A brief but genuinely useful note about HTTP caching headers, short enough to look thin to the extractor.</p></article>
</body></html>`;

type StubResponse = { body: string } | { status: number; statusText: string } | { networkError: string };

/**
 * Replaces globalThis.fetch for the duration of one test. node:test runs one
 * process per file and top-level tests sequentially, so a single save/restore
 * pair is sufficient; the returned restore must run in a finally block.
 */
function stubFetch(responses: Record<string, StubResponse>) {
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString();
    const response = responses[url];
    if (!response) throw new Error(`Unexpected fetch for ${url}`);

    if ("networkError" in response) {
      throw new TypeError(response.networkError);
    }
    if ("status" in response) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => "",
      };
    }
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => response.body,
    };
  }) as typeof globalThis.fetch;

  return () => {
    globalThis.fetch = original;
  };
}

const fallbackPreferences: CommandPreferences = {
  externalFallbackEnabled: true,
  externalFallbackPrefix: FALLBACK_PREFIX,
};

test("convertWebpageToMarkdown keeps local content when the external fallback yields nothing", async () => {
  const restore = stubFetch({
    [SHORT_PAGE_URL]: { body: SHORT_PAGE_HTML },
    // Fallback service answers with an empty body, so it produces no article.
    [FALLBACK_URL]: { body: "   \n  " },
  });

  try {
    const result = await convertWebpageToMarkdown({
      url: SHORT_PAGE_URL,
      preferences: fallbackPreferences,
    });

    assert.match(result.markdown, /HTTP caching headers/);
    assert.equal(result.title, "Short Note");
  } finally {
    restore();
  }
});

test("convertWebpageToMarkdown keeps local content when the external fallback returns an HTTP error", async () => {
  const restore = stubFetch({
    [SHORT_PAGE_URL]: { body: SHORT_PAGE_HTML },
    [FALLBACK_URL]: { status: 502, statusText: "Bad Gateway" },
  });

  try {
    const result = await convertWebpageToMarkdown({
      url: SHORT_PAGE_URL,
      preferences: fallbackPreferences,
    });

    assert.match(result.markdown, /HTTP caching headers/);
    assert.equal(result.title, "Short Note");
  } finally {
    restore();
  }
});

test("convertWebpageToMarkdown keeps local content when the external fallback is unreachable", async () => {
  const restore = stubFetch({
    [SHORT_PAGE_URL]: { body: SHORT_PAGE_HTML },
    [FALLBACK_URL]: { networkError: "fetch failed" },
  });

  try {
    const result = await convertWebpageToMarkdown({
      url: SHORT_PAGE_URL,
      preferences: fallbackPreferences,
    });

    assert.match(result.markdown, /HTTP caching headers/);
  } finally {
    restore();
  }
});

test("convertWebpageToMarkdown prefers the external fallback when it returns more content", async () => {
  const fallbackBody = `# Short Note\n\n${"Much richer fallback prose about caching. ".repeat(10)}`;
  const restore = stubFetch({
    [SHORT_PAGE_URL]: { body: SHORT_PAGE_HTML },
    [FALLBACK_URL]: { body: fallbackBody },
  });

  try {
    const result = await convertWebpageToMarkdown({
      url: SHORT_PAGE_URL,
      preferences: { ...fallbackPreferences, includeFrontmatter: true },
    });

    assert.match(result.markdown, /Much richer fallback prose/);
    // The reader service returns no metadata, so locally-extracted title and
    // author must survive being replaced by the fallback body.
    assert.equal(result.title, "Short Note");
    assert.match(result.markdown, /^title: "Short Note"$/m);
    assert.match(result.markdown, /^author: "By Jane Doe"$/m);
  } finally {
    restore();
  }
});

test("convertWebpageToMarkdown falls back to the reader service when the page itself is blocked", async () => {
  const fallbackBody = `# Short Note\n\n${"Content rescued from behind the block. ".repeat(10)}`;
  const restore = stubFetch({
    // A paywall / bot-block is the main reason local extraction fails, and it
    // surfaces as a non-2xx from the primary fetch rather than thin content.
    [SHORT_PAGE_URL]: { status: 403, statusText: "Forbidden" },
    [FALLBACK_URL]: { body: fallbackBody },
  });

  try {
    const result = await convertWebpageToMarkdown({
      url: SHORT_PAGE_URL,
      preferences: fallbackPreferences,
    });

    assert.match(result.markdown, /Content rescued from behind the block/);
  } finally {
    restore();
  }
});

test("convertWebpageToMarkdown returns a frontmatter-free body for previews", async () => {
  const restore = stubFetch({ [SHORT_PAGE_URL]: { body: SHORT_PAGE_HTML } });

  try {
    const result = await convertWebpageToMarkdown({
      url: SHORT_PAGE_URL,
      preferences: { includeFrontmatter: true },
    });

    // The saved/copied document keeps its frontmatter…
    assert.match(result.markdown, /^---$/m);
    assert.match(result.markdown, /^sourceURL: /m);

    // …but Raycast's Detail renderer prints YAML frontmatter as literal text,
    // so the preview body must not carry it.
    assert.doesNotMatch(result.body, /^---$/m);
    assert.doesNotMatch(result.body, /sourceURL/);
    assert.doesNotMatch(result.body, /savedDate/);
    assert.match(result.body, /HTTP caching headers/);
  } finally {
    restore();
  }
});

test("convertWebpageToMarkdown surfaces the original fetch error when no fallback is configured", async () => {
  const restore = stubFetch({
    [SHORT_PAGE_URL]: { status: 403, statusText: "Forbidden" },
  });

  try {
    await assert.rejects(
      convertWebpageToMarkdown({
        url: SHORT_PAGE_URL,
        preferences: {},
      }),
      /403 Forbidden/,
    );
  } finally {
    restore();
  }
});

test("convertWebpageToMarkdown still fails when neither source yields content", async () => {
  const restore = stubFetch({
    [SHORT_PAGE_URL]: { body: "<!doctype html><html><body></body></html>" },
    [FALLBACK_URL]: { body: "" },
  });

  try {
    await assert.rejects(
      convertWebpageToMarkdown({
        url: SHORT_PAGE_URL,
        preferences: fallbackPreferences,
      }),
      /Could not extract/,
    );
  } finally {
    restore();
  }
});
