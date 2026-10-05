import { afterEach, describe, expect, it } from "vitest";
import { resolveThreadsPost } from "./threads-post";

const CODE = "ABCdef12345";
const POST_URL = `https://www.threads.com/@u/post/${CODE}`;
const VIDEO = `{"url":"https://cdn.example/v.mp4","width":1920,"height":1080}`;

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Serve a canned page, and pretend the request landed at `url`. */
function serve(html: string, url = POST_URL) {
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    url,
    text: async () => html,
  })) as unknown as typeof fetch;
}

describe("finding the post in the page", () => {
  it("survives a caption full of braces without rescanning quadratically", async () => {
    serve(`{"caption":"${"{".repeat(5000)}","code":"${CODE}","video_versions":[${VIDEO}]}${"x".repeat(800_000)}`);

    const started = Date.now();
    const post = await resolveThreadsPost(POST_URL);
    const elapsed = Date.now() - started;

    expect(post.media).toHaveLength(1);
    // The pre-fix implementation took ~11s on this input.
    expect(elapsed).toBeLessThan(1500);
  });

  it('does not stop at a bare {"code"} back-reference', async () => {
    serve(`{"feed":[{"ref":{"code":"${CODE}"}},{"code":"${CODE}","video_versions":[${VIDEO}]}]}`);
    expect((await resolveThreadsPost(POST_URL)).media).toHaveLength(1);
  });

  it("does not stop at a reference whose video_versions is empty", async () => {
    // `[]` is truthy, so a key-presence test accepts this node and reports no media at all.
    serve(`{"feed":[{"code":"${CODE}","video_versions":[]},{"code":"${CODE}","video_versions":[${VIDEO}]}]}`);
    expect((await resolveThreadsPost(POST_URL)).media).toHaveLength(1);
  });

  it("matches even if the payload is not minified", async () => {
    serve(`{"code" : "${CODE}", "video_versions":[${VIDEO}]}`);
    expect((await resolveThreadsPost(POST_URL)).media).toHaveLength(1);
  });

  it("is not unbalanced by a brace inside a caption string", async () => {
    serve(`{"caption":"a } b \\" c {","code":"${CODE}","video_versions":[${VIDEO}]}`);
    expect((await resolveThreadsPost(POST_URL)).media).toHaveLength(1);
  });
});

describe("where the payload lives", () => {
  const PAYLOAD = `{"code":"${CODE}","video_versions":[${VIDEO}]}`;

  it("reads the payload out of a script block, as real pages serve it", async () => {
    serve(`<script type="application/json" data-sjs>${PAYLOAD}</script>`);
    expect((await resolveThreadsPost(POST_URL)).media).toHaveLength(1);
  });

  it.each([
    ["body text", `<p>5" nails</p>`],
    ["an HTML comment", `<!-- " -->`],
    ["an earlier script block", `<script>var s = '"';</script>`],
  ])("is not derailed by a stray double-quote in %s", async (_name, prefix) => {
    // indexBraces treats every `"` as a JSON string delimiter, so one unbalanced quote used
    // to leave it stuck mid-string and the payload's braces were never indexed at all.
    serve(`${prefix}<script type="application/json">${PAYLOAD}</script>`);
    expect((await resolveThreadsPost(POST_URL)).media).toHaveLength(1);
  });
});

describe("voice posts", () => {
  it("finds the audio source, which lives outside the versions arrays", async () => {
    serve(`{"code":"${CODE}","audio":{"audio_src":"https://cdn.example/voice.mp4"}}`);
    const post = await resolveThreadsPost(POST_URL);
    expect(post.media).toEqual([{ url: "https://cdn.example/voice.mp4", kind: "audio" }]);
  });

  it.each([
    ["absent", `{"code":"${CODE}","audio":{"waveform_data":[0.1]}}`],
    ["plain http", `{"code":"${CODE}","audio":{"audio_src":"http://cdn.example/a.mp4"}}`],
    ["credential-bearing", `{"code":"${CODE}","audio":{"audio_src":"https://u:p@cdn.example/a.mp4"}}`],
    ["not a string", `{"code":"${CODE}","audio":{"audio_src":123}}`],
    ["empty", `{"code":"${CODE}","audio":{"audio_src":""}}`],
    ["audio is a string", `{"code":"${CODE}","audio":"x"}`],
  ])("ignores an audio source that is %s", async (_name, body) => {
    serve(body);
    expect((await resolveThreadsPost(POST_URL)).media).toEqual([]);
  });

  it("prefers real video over audio when a post somehow has both", async () => {
    serve(`{"code":"${CODE}","video_versions":[${VIDEO}],"audio":{"audio_src":"https://cdn.example/a.mp4"}}`);
    const post = await resolveThreadsPost(POST_URL);
    expect(post.media).toEqual([{ url: "https://cdn.example/v.mp4", kind: "video" }]);
  });
});

describe("untrusted payloads", () => {
  // The expected URLs are spelled out rather than looped over: asserting only "everything
  // returned is https" passes when nothing is returned, which would hide usable media being
  // silently dropped.
  it.each([
    ["carousel_media is a string", `{"code":"${CODE}","carousel_media":"x"}`, []],
    [
      "carousel_media has null items",
      `{"code":"${CODE}","carousel_media":[null,{"video_versions":[${VIDEO}]}]}`,
      ["https://cdn.example/v.mp4"],
    ],
    ["video_versions is a string", `{"code":"${CODE}","video_versions":"x"}`, []],
    ["video_versions has null items", `{"code":"${CODE}","video_versions":[null]}`, []],
    ["a candidate has no url", `{"code":"${CODE}","video_versions":[{}]}`, []],
    ["a candidate url is javascript:", `{"code":"${CODE}","video_versions":[{"url":"javascript:bad"}]}`, []],
    [
      "dimensions are strings",
      `{"code":"${CODE}","video_versions":[{"url":"https://cdn.example/a.mp4","width":"x"}]}`,
      ["https://cdn.example/a.mp4"],
    ],
  ])("survives %s without throwing, and keeps what is usable", async (_name, body, expected) => {
    serve(body);
    const post = await resolveThreadsPost(POST_URL);
    expect(post.media.map((item) => item.url)).toEqual(expected);
  });

  it('does not accept the bare string "https://" as a candidate', async () => {
    serve(`{"code":"${CODE}","video_versions":[{"url":"https://","width":9999,"height":9999},${VIDEO}]}`);
    const post = await resolveThreadsPost(POST_URL);
    // It sorts highest by area, so a prefix-only check would let it displace the real one.
    expect(post.media).toHaveLength(1);
    expect(post.media[0].url).toBe("https://cdn.example/v.mp4");
  });
});

describe("the link the user pasted", () => {
  it("upgrades http:// to https before making the request", async () => {
    let requested = "";
    globalThis.fetch = (async (input: URL) => {
      requested = input.toString();
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        url: POST_URL,
        text: async () => `{"code":"${CODE}","video_versions":[${VIDEO}]}`,
      };
    }) as unknown as typeof fetch;

    await resolveThreadsPost(`http://www.threads.com/@u/post/${CODE}`);
    expect(requested).toMatch(/^https:\/\//);
  });

  it.each([
    ["a file:// scheme", `file://threads.com/post/${CODE}`, /https link/],
    ["embedded credentials", `https://user:pw@www.threads.com/@u/post/${CODE}`, /credentials/],
    ["a non-URL", "not a url", /doesn't look like a URL/],
    ["a non-Threads host", "https://example.com/@a/post/B", /threads\.com link/],
  ])("rejects %s before making any request", async (_name, url, message) => {
    // Without this spy the test passes even if validation is gone, because the request then
    // fails on its own — a green tick for a hole.
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      throw new Error("network");
    }) as unknown as typeof fetch;

    await expect(resolveThreadsPost(url)).rejects.toThrow(message);
    expect(called).toBe(false);
  });

  it("does not read /post/ABC.extra as ABC", async () => {
    serve(`{"code":"${CODE}","video_versions":[${VIDEO}]}`, `${POST_URL}.extra`);
    await expect(resolveThreadsPost(`${POST_URL}.extra`)).rejects.toThrow();
  });

  it("reports a ?error=invalid_post bounce as a refusal, not a bad link", async () => {
    serve(`{"code":"${CODE}"}`, "https://www.threads.com/?error=invalid_post");
    // Threads bounces posts it won't serve anonymously; the message must not blame the link.
    await expect(resolveThreadsPost(POST_URL)).rejects.toThrow(/signed-out request/);
  });
});
