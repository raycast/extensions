const assert = require("node:assert/strict");
const { test } = require("node:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const loadSource = require("./load-source.cjs");

function loadTitles({ exec, fetch, installed = true, globals = {} } = {}) {
  const githubTitles = loadSource(
    "utils/github-title.ts",
    {
      "node:fs": { existsSync: () => installed },
      "node:util": {
        promisify: () => exec || (() => assert.fail("Unexpected GitHub invocation")),
      },
    },
    { console: { warn: () => {} } },
  );
  return loadSource(
    "utils/page-title.ts",
    { "./github-title": githubTitles },
    {
      fetch: fetch || (() => assert.fail("Unexpected HTTP request")),
      console: { warn: () => {} },
      ...globals,
    },
  );
}

const response = (html) => new Response(html);

function streamedResponse(chunks, signal, headers = {}) {
  let reads = 0;
  const body = new ReadableStream(
    {
      start(controller) {
        signal.addEventListener("abort", () => controller.error(new Error("Aborted")));
      },
      pull(controller) {
        if (reads < chunks.length) controller.enqueue(chunks[reads++]);
        else controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  return { response: new Response(body, { headers }), body, reads: () => reads };
}

test("HTML accepts exactly 1 MiB and preserves UTF-8 across chunk boundaries", async () => {
  const title = "<title>Café</title>";
  const html = Buffer.from(title + " ".repeat(1024 * 1024 - Buffer.byteLength(title)));
  const split = html.indexOf(Buffer.from("é")) + 1;
  const titles = loadTitles({
    fetch: async (_url, { signal }) =>
      streamedResponse([html.subarray(0, split), html.subarray(split)], signal).response,
  });
  assert.equal(await titles.fetchPageTitle("https://example.com"), "Café");
});

for (const headers of [{}, { "content-length": "1" }, { "content-encoding": "gzip", "content-length": "64" }]) {
  test(`HTML enforces actual body bytes regardless of headers: ${JSON.stringify(headers)}`, async () => {
    let stream;
    let signal;
    const titles = loadTitles({
      fetch: async (_url, options) => {
        signal = options.signal;
        stream = streamedResponse(
          [Buffer.alloc(1024 * 1024, 32), Buffer.from("x"), Buffer.from("must not be read")],
          signal,
          headers,
        );
        return stream.response;
      },
    });
    await assert.rejects(titles.fetchPageTitle("https://example.com"), /1 MiB limit/);
    assert.equal(stream.reads(), 2);
    assert.equal(signal.aborted, true);
    assert.equal(stream.body.locked, false);
  });
}

test("a single oversized chunk uses the command's original-URL fallback", async () => {
  const url = "https://example.com";
  let signal;
  const titles = loadTitles({
    fetch: async (_url, options) => {
      signal = options.signal;
      return streamedResponse([Buffer.alloc(1024 * 1024 + 1, 32)], signal).response;
    },
  });
  const { run, state } = loadCommand({ input: url, lookup: titles.fetchPageTitle });
  await run();
  assert.deepEqual(state.copies, [url]);
  assert.match(state.errors[0].error.message, /1 MiB limit/);
  assert.equal(state.hud.length, 0);
  assert.equal(signal.aborted, true);
});

test("HTTP timeout during body reading aborts the stream and releases its lock", async () => {
  let expire;
  let cleared = false;
  let body;
  const titles = loadTitles({
    globals: {
      setTimeout: (fn, ms) => {
        assert.equal(ms, 6000);
        expire = fn;
        return 1;
      },
      clearTimeout: () => {
        cleared = true;
      },
    },
    fetch: async (_url, { signal }) => {
      body = new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from("<title>Incomplete"));
          signal.addEventListener("abort", () => controller.error(new Error("Aborted")));
        },
        pull() {
          expire();
        },
      });
      return new Response(body);
    },
  });
  await assert.rejects(titles.fetchPageTitle("https://example.com"), /Aborted/);
  assert.equal(cleared, true);
  assert.equal(body.locked, false);
});

test("empty and failed response streams release resources", async () => {
  const url = "https://example.com";
  assert.equal(await loadTitles({ fetch: async () => new Response(null, { status: 204 }) }).fetchPageTitle(url), url);
  const body = new ReadableStream({
    start(controller) {
      controller.error(new Error("Connection lost"));
    },
  });
  await assert.rejects(loadTitles({ fetch: async () => new Response(body) }).fetchPageTitle(url), /Connection lost/);
  assert.equal(body.locked, false);
});

test("rich links escape the title and URL, with an unchanged raw URL fallback", () => {
  const formatter = loadSource("utils/formatter.ts", { "@raycast/api": {}, "@raycast/utils": {} });
  const url = 'https://example.com/?q="a"&b=1';
  const content = formatter.generateRichLink(url, "A <B> & \"C\" 'D'");
  assert.equal(content.text, url);
  assert.equal(
    content.html,
    '<a href="https://example.com/?q=&quot;a&quot;&amp;b=1">A &lt;B&gt; &amp; &quot;C&quot; &#039;D&#039;</a>',
  );
});

test("existing HTML, Markdown and custom formatting still produce strings", () => {
  const formatter = loadSource("utils/formatter.ts", {
    "@raycast/api": { getPreferenceValues: () => ({ customFormat: "{title} | {url} | {id} | {favicon}" }) },
    "@raycast/utils": {},
  });
  const tab = { title: "Example", url: "https://example.com", id: 42, favicon: "icon.png" };
  assert.equal(formatter.generateHTML(tab), '<a href="https://example.com">Example</a>');
  assert.equal(formatter.generateMarkdown(tab), "[Example](https://example.com)");
  assert.equal(formatter.generateCustomTemplate(tab), "Example | https://example.com | 42 | icon.png");
});

test("only HTTP(S) clipboard URLs are accepted", () => {
  const { isWebUrl } = loadTitles();
  for (const url of ["https://example.com", "http://example.com/path"]) assert.equal(isWebUrl(url), true);
  for (const url of ["", "hello", "javascript:alert(1)", "file:///etc/hosts", "ftp://example.com"]) {
    assert.equal(isWebUrl(url), false);
  }
});

for (const [kind, command] of [
  ["pull", "pr"],
  ["issues", "issue"],
  ["discussions", "api"],
]) {
  test(`authenticated ${kind} lookup preserves the route and bounds the subprocess`, async () => {
    const titles = loadTitles({
      exec: async (file, args, options) => {
        assert.equal(file, "/opt/homebrew/bin/gh");
        assert.equal(args[0], command);
        assert.equal(options.timeout, 5000);
        assert.equal(options.killSignal, "SIGKILL");
        assert.equal(options.env.GH_HOST, "github.com");
        assert.equal(options.env.GH_PROMPT_DISABLED, "1");
        if (kind === "discussions") {
          assert.ok(args.includes("owner=example"));
          assert.ok(args.includes("name=project"));
          assert.ok(args.includes("number=123"));
          assert.ok(args.includes(".data.repository.discussion.title // empty"));
        } else {
          assert.ok(args.includes("example/project"));
          assert.ok(args.includes("123"));
        }
        return { stdout: "  Example title\n" };
      },
    });
    assert.equal(
      await titles.fetchPageTitle(`https://github.com/example/project/${kind}/123#comment`),
      "Example title",
    );
  });
}

test("lookalike hosts and unsupported GitHub paths do not invoke authenticated gh", async () => {
  const titles = loadTitles({ fetch: async () => response("<title>Public page</title>") });
  for (const url of [
    "https://github.com.example.org/example/project/issues/123",
    "https://example.com/github.com/example/project/issues/123",
    "https://github.com/example/project/issues/123invalid",
    "https://github.com/example/project",
  ]) {
    assert.equal(await titles.fetchPageTitle(url), "Public page");
  }
});

for (const scenario of ["missing gh", "failed gh", "empty result"]) {
  test(`${scenario} falls back to page HTML`, async () => {
    const titles = loadTitles({
      installed: scenario !== "missing gh",
      exec: async () => {
        if (scenario === "failed gh") throw new Error("Lookup failed");
        return { stdout: "" };
      },
      fetch: async () => response("<title>HTML title &amp; text</title>"),
    });
    assert.equal(
      await titles.fetchPageTitle("https://github.com/example/project/discussions/123"),
      "HTML title & text",
    );
  });
}

test("a genuinely stalled subprocess is terminated and falls back after five seconds", { timeout: 10000 }, async () => {
  let killed = false;
  const run = promisify(execFile);
  const start = Date.now();
  const titles = loadTitles({
    exec: async (_file, _args, options) => {
      try {
        return await run(process.execPath, ["-e", "setInterval(() => {}, 1000)"], options);
      } catch (error) {
        killed = error.killed && error.signal === "SIGKILL";
        throw error;
      }
    },
    fetch: async () => response("<title>Fallback title</title>"),
  });
  assert.equal(await titles.fetchPageTitle("https://github.com/example/project/pull/123"), "Fallback title");
  assert.equal(killed, true);
  assert.ok(Date.now() - start >= 4900);
  assert.ok(Date.now() - start < 9000);
});

test("HTML lookup handles title, og:title, missing title and HTTP failure", async () => {
  const url = "https://example.com/";
  for (const [html, expected] of [
    ['<title> Title &quot;quoted&quot; </title><meta property="og:title" content="Other">', 'Title "quoted"'],
    ['<meta property="og:title" content="Open Graph title">', "Open Graph title"],
    ["<body>No metadata</body>", url],
  ]) {
    assert.equal(await loadTitles({ fetch: async () => response(html) }).fetchPageTitle(url), expected);
  }
  await assert.rejects(
    loadTitles({ fetch: async () => ({ ok: false, status: 404 }) }).fetchPageTitle(url),
    /status 404/,
  );
});

test("HTTP timeout aborts fetching and clears the timer", async () => {
  let expire;
  let cleared = false;
  const titles = loadTitles({
    globals: {
      setTimeout: (fn, ms) => {
        assert.equal(ms, 6000);
        expire = fn;
        return 1;
      },
      clearTimeout: (id) => {
        assert.equal(id, 1);
        cleared = true;
      },
    },
    fetch: async (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("Aborted")));
        expire();
      }),
  });
  await assert.rejects(titles.fetchPageTitle("https://example.com"), /Aborted/);
  assert.equal(cleared, true);
});

function loadCommand({ input, lookup = async () => "Page title", copy, readError } = {}) {
  const state = { copies: [], errors: [], toasts: [], hidden: 0, hud: [] };
  const api = {
    Clipboard: {
      readText: async () => {
        if (readError) throw readError;
        return input;
      },
      copy: async (content) => {
        if (copy) await copy(content);
        state.copies.push(content);
      },
    },
    showHUD: async (text) => state.hud.push(text),
    showToast: async (options) => {
      state.toasts.push(options);
      return { hide: async () => state.hidden++ };
    },
    Toast: { Style: { Failure: "failure", Animated: "animated" } },
  };
  const utils = {
    showFailureToast: async (error, options) => state.errors.push({ error, ...options, hidden: state.hidden }),
  };
  const formatter = loadSource("utils/formatter.ts", { "@raycast/api": api, "@raycast/utils": utils });
  const command = loadSource("copy-clipboard-for-slack.ts", {
    "@raycast/api": api,
    "@raycast/utils": utils,
    "./utils/formatter": formatter,
    "./utils/page-title": { isWebUrl: loadTitles().isWebUrl, fetchPageTitle: lookup },
  });
  return { run: command.default, state };
}

test("command copies HTML and raw URL without a browser extension", async () => {
  const { run, state } = loadCommand({ input: " https://example.com/?a=1&b=2 " });
  await run();
  assert.equal(state.copies.length, 1);
  assert.equal(state.copies[0].text, "https://example.com/?a=1&b=2");
  assert.equal(state.copies[0].html, '<a href="https://example.com/?a=1&amp;b=2">Page title</a>');
  assert.equal(state.errors.length, 0);
  assert.equal(state.hidden, 1);
});

test("invalid or empty clipboard input is left untouched", async () => {
  for (const input of [undefined, "", "not a URL", "file:///tmp/test"]) {
    const { run, state } = loadCommand({ input, lookup: () => assert.fail("Unexpected lookup") });
    await run();
    assert.equal(state.copies.length, 0);
    assert.equal(state.toasts[0].style, "failure");
  }
});

test("fetch failure copies the original URL and reports the failure", async () => {
  const { run, state } = loadCommand({
    input: "https://example.com",
    lookup: async () => {
      throw new Error("Network error");
    },
  });
  await run();
  assert.deepEqual(state.copies, ["https://example.com"]);
  assert.equal(state.errors[0].title, "Couldn't Fetch Title; Copied Original URL");
  assert.equal(state.errors[0].hidden, 1, "Dismiss progress before showing an error, not after");
  assert.equal(state.hud.length, 0);
  assert.equal(state.hidden, 1);
});

test("clipboard access failures are reported without a success HUD", async () => {
  for (const options of [
    { readError: new Error("Read failed") },
    {
      copy: async () => {
        throw new Error("Write failed");
      },
    },
  ]) {
    const { run, state } = loadCommand({ input: "https://example.com", ...options });
    await run();
    assert.equal(state.errors[0].title, "Couldn't Copy Link");
    assert.equal(state.hud.length, 0);
  }
});
