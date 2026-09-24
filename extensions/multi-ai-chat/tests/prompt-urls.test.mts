import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_SERVICES,
  buildPromptUrl,
  buildPromptUrlRequests,
  openPromptUrlRequests,
} from "../src/lib/prompt-urls.ts";

test("service catalog preserves the supported service order and endpoints", () => {
  assert.deepEqual(
    AI_SERVICES.map(({ id, name, url }) => ({ id, name, url })),
    [
      {
        id: "chatgpt",
        name: "ChatGPT",
        url: "https://chatgpt.com/",
      },
      {
        id: "claude",
        name: "Claude",
        url: "https://claude.ai/new",
      },
      { id: "grok", name: "Grok", url: "https://grok.com/" },
      {
        id: "perplexity",
        name: "Perplexity",
        url: "https://www.perplexity.ai/search",
      },
    ],
  );
});

test("builds each provider URL with the prompt in the q parameter", () => {
  assert.deepEqual(
    AI_SERVICES.map((service) => buildPromptUrl(service, "hello world")),
    [
      "https://chatgpt.com/?q=hello+world",
      "https://claude.ai/new?q=hello+world",
      "https://grok.com/?q=hello+world",
      "https://www.perplexity.ai/search?q=hello+world",
    ],
  );
});

test("encodes reserved characters, unicode, and line breaks without truncation", () => {
  const prompt = "  A&B #1\nOlá 👋\t";

  for (const service of AI_SERVICES) {
    const url = new URL(buildPromptUrl(service, prompt));
    assert.equal(url.searchParams.get("q"), prompt);
  }
});

test("expands tab counts in canonical service order and skips disabled services", () => {
  const requests = buildPromptUrlRequests("compare", {
    perplexity: 2,
    chatgpt: 2,
    claude: 0,
    grok: 1,
  });

  assert.deepEqual(
    requests.map(({ service, tabNumber, url }) => ({
      service: service.id,
      tabNumber,
      url,
    })),
    [
      {
        service: "chatgpt",
        tabNumber: 1,
        url: "https://chatgpt.com/?q=compare",
      },
      {
        service: "chatgpt",
        tabNumber: 2,
        url: "https://chatgpt.com/?q=compare",
      },
      {
        service: "grok",
        tabNumber: 1,
        url: "https://grok.com/?q=compare",
      },
      {
        service: "perplexity",
        tabNumber: 1,
        url: "https://www.perplexity.ai/search?q=compare",
      },
      {
        service: "perplexity",
        tabNumber: 2,
        url: "https://www.perplexity.ai/search?q=compare",
      },
    ],
  );
});

test("ignores invalid tab counts outside the supported 0–5 range", () => {
  const requests = buildPromptUrlRequests("compare", {
    chatgpt: 6,
    claude: -1,
    grok: 1.5,
    perplexity: Number.NaN,
  });

  assert.deepEqual(requests, []);
});

test("opens requests sequentially, continues after failure, and aggregates results", async () => {
  const requests = buildPromptUrlRequests("compare", {
    chatgpt: 1,
    claude: 1,
    grok: 1,
  });
  const calls: [string, string?][] = [];
  let activeCalls = 0;
  let maximumActiveCalls = 0;

  const result = await openPromptUrlRequests(
    requests,
    "com.google.Chrome",
    async (...args: [string, string?]) => {
      calls.push(args);
      activeCalls++;
      maximumActiveCalls = Math.max(maximumActiveCalls, activeCalls);
      await new Promise<void>((resolve) => setImmediate(resolve));
      activeCalls--;

      if (args[0].startsWith("https://claude.ai/")) {
        throw new Error("open failed");
      }
    },
  );

  assert.equal(maximumActiveCalls, 1);
  assert.deepEqual(calls, [
    ["https://chatgpt.com/?q=compare", "com.google.Chrome"],
    ["https://claude.ai/new?q=compare", "com.google.Chrome"],
    ["https://grok.com/?q=compare", "com.google.Chrome"],
  ]);
  assert.deepEqual(result, {
    total: 3,
    succeeded: 2,
    failed: 1,
    errors: ["Claude tab 1: open failed"],
  });
});

test("omits the application argument when using the system browser", async () => {
  const requests = buildPromptUrlRequests("compare", { perplexity: 1 });
  const calls: [string, string?][] = [];

  const result = await openPromptUrlRequests(
    requests,
    "",
    async (...args: [string, string?]) => {
      calls.push(args);
    },
  );

  assert.deepEqual(calls, [
    ["https://www.perplexity.ai/search?q=compare"],
  ]);
  assert.deepEqual(result, {
    total: 1,
    succeeded: 1,
    failed: 0,
    errors: [],
  });
});
