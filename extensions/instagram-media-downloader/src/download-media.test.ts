import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { Clipboard, launchCommand, open } from "@raycast/api";
import { browserExtensionAvailable, readPostFromBrowser, readReelFromBrowser } from "./browser-tab";
// `vi.mock` calls below are hoisted above this import, so it loads against the fakes.
import { logger } from "@chrismessina/raycast-logger";
import {
  DownloadMethod,
  downloadMediaSet,
  handleDownload,
  handOff,
  resolveMedia,
  runExclusive,
  showErrorToast,
} from "./download-media";

/**
 * A recorded toast: what it was created with, and the object the code then mutates. Raycast's
 * toast is a live handle, so the final state is whatever the code assigned last.
 */
type FakeToast = { created: string; title?: string; message?: string; style?: string };
const toasts: FakeToast[] = [];

vi.mock("@raycast/api", () => ({
  showToast: vi.fn(async (options: { title?: string; message?: string; style?: string }) => {
    const toast: FakeToast & { show: () => Promise<void> } = {
      created: options.title ?? "",
      ...options,
      show: async () => {},
    };
    toasts.push(toast);
    return toast;
  }),
  Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
  Keyboard: { Shortcut: { Common: { Copy: "copy", CopyPath: "copy-path", Open: "open" } } },
  Clipboard: { copy: vi.fn() },
  showHUD: vi.fn(),
  showInFinder: vi.fn(),
  open: vi.fn(),
  launchCommand: vi.fn(),
  LaunchType: { UserInitiated: "userInitiated" },
}));
vi.mock("@chrismessina/raycast-logger", () => ({ logger: { log: vi.fn(), error: vi.fn() } }));
vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("./browser-tab", () => ({
  readPostFromBrowser: vi.fn(),
  readReelFromBrowser: vi.fn(),
  browserExtensionAvailable: vi.fn(() => true),
}));

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

/** What the downloader CDN actually sends: octet-stream, with or without a length. */
function media(bytes: Buffer = JPEG): Response {
  return new Response(bytes, { headers: { "content-type": "application/octet-stream" } });
}

/** Bytes written into the `.part` file before the drop, read from disk at the moment it happens. */
let bytesOnDiskAtDrop = 0;

/**
 * A body that delivers a chunk, then fails the way Node's fetch reports a lost connection.
 * Erroring inside `start()` would discard the queued chunk, so the drop is deferred until the
 * chunk is on disk — otherwise this tests an empty reservation, not a partial file.
 */
function dropsMidway(): Response {
  let pulls = 0;
  const body = new ReadableStream({
    async pull(controller) {
      if (pulls++ === 0) {
        controller.enqueue(new Uint8Array(JPEG));
        return;
      }
      for (let i = 0; i < 50 && bytesOnDiskAtDrop === 0; i++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const part = (await readdir(folder)).find((name) => name.endsWith(".part"));
        if (part) bytesOnDiskAtDrop = (await readFile(join(folder, part))).length;
      }
      controller.error(new TypeError("terminated"));
    },
  });
  return new Response(body, { headers: { "content-type": "application/octet-stream" } });
}

function serve(routes: Record<string, () => Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => routes[url]?.() ?? new Response("missing", { status: 404, statusText: "Not Found" })),
  );
}

let folder: string;
beforeEach(async () => {
  toasts.length = 0;
  folder = await mkdtemp(join(tmpdir(), "igmd-dl-"));
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(folder, { recursive: true, force: true });
});

describe("runExclusive", () => {
  it("refuses a second run while one is going, then releases even after a throw", async () => {
    const runs: string[] = [];
    let finishFirst!: () => void;

    const first = runExclusive(
      () =>
        new Promise<void>((resolve) => {
          runs.push("first");
          finishFirst = resolve;
        }),
    );
    await runExclusive(async () => {
      runs.push("overlapping");
    });

    expect(runs).toEqual(["first"]);
    expect(toasts.map((toast) => toast.title)).toEqual(["Download Already Running"]);

    finishFirst();
    await first;

    await expect(
      runExclusive(async () => {
        runs.push("throws");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    await runExclusive(async () => {
      runs.push("after the throw");
    });

    expect(runs).toEqual(["first", "throws", "after the throw"]);
  });
});

describe("handleDownload", () => {
  it("saves the file under its final name with every byte, and nothing else", async () => {
    serve({ "https://cdn.test/a.jpg": () => media() });

    const saved = await handleDownload("https://cdn.test/a.jpg", "De_XnTMAStE-1", folder, "Media 1 of 4");

    expect(saved).toBe(join(folder, "De_XnTMAStE-1.jpg"));
    expect(await readdir(folder)).toEqual(["De_XnTMAStE-1.jpg"]);
    expect(await readFile(join(folder, "De_XnTMAStE-1.jpg"))).toEqual(JPEG);
    expect(toasts.at(-1)).toMatchObject({ style: "success", title: "Downloaded Media 1 of 4" });
  });

  const failures: [string, () => Response, RegExp][] = [
    [
      "an HTML error page served as a 200",
      () => new Response("<html>expired</html>", { headers: { "content-type": "text/html" } }),
      /text\/html/,
    ],
    ["an empty body", () => media(Buffer.alloc(0)), /empty response/],
    ["a connection that drops mid-download", dropsMidway, /terminated/],
    ["a 404", () => new Response("gone", { status: 404, statusText: "Not Found" }), /404/],
  ];

  for (const [name, response, reason] of failures) {
    it(`fails cleanly on ${name}: no file, no placeholder, no .part`, async () => {
      serve({ "https://cdn.test/a.jpg": response });

      const saved = await handleDownload("https://cdn.test/a.jpg", "De_XnTMAStE", folder, "Media");

      expect(saved).toBeNull();
      expect(await readdir(folder)).toEqual([]);
      expect(toasts.at(-1)).toMatchObject({ style: "failure", title: "Couldn't Download Media" });
      expect(toasts.at(-1)?.message).toMatch(reason);
      if (response === dropsMidway) expect(bytesOnDiskAtDrop).toBe(JPEG.length);
    });
  }
});

describe("downloadMediaSet", () => {
  const carousel = [1, 2, 3, 4].map((n) => ({ url: `https://cdn.test/${n}.jpg`, name: `De_XnTMAStE-${n}` }));

  it("labels each item, keeps going past a failure, and ends on an accurate partial summary", async () => {
    serve({
      "https://cdn.test/1.jpg": () => media(),
      "https://cdn.test/2.jpg": () => media(),
      // 3 is missing: the fake server answers 404.
      "https://cdn.test/4.jpg": () => media(),
    });

    await downloadMediaSet(carousel, folder, "Media");

    expect(toasts.map((toast) => toast.created)).toEqual([
      "Downloading Media 1 of 4",
      "Downloading Media 2 of 4",
      "Downloading Media 3 of 4",
      "Downloading Media 4 of 4",
      "Download Partly Failed",
    ]);
    expect(toasts.at(-1)).toMatchObject({ style: "failure", message: `Saved 3 of 4 files to ${folder}` });
    expect((await readdir(folder)).sort()).toEqual(["De_XnTMAStE-1.jpg", "De_XnTMAStE-2.jpg", "De_XnTMAStE-4.jpg"]);
  });

  it("ends on a success summary when every item saves", async () => {
    serve(Object.fromEntries(carousel.map((item) => [item.url, () => media()])));

    await downloadMediaSet(carousel, folder, "Media");

    expect(toasts.at(-1)).toMatchObject({
      style: "success",
      title: "Download Complete",
      message: `Saved 4 of 4 files to ${folder}`,
    });
  });

  it("shows no summary for a single item — its own toast is the result", async () => {
    serve({ "https://cdn.test/reel.mp4": () => media() });

    await downloadMediaSet([{ url: "https://cdn.test/reel.mp4", name: "DReel123" }], folder, "Media");

    expect(toasts.map((toast) => toast.created)).toEqual(["Downloading Media"]);
    expect(toasts[0]).toMatchObject({ style: "success", title: "Downloaded Media" });
    expect(await readdir(folder)).toEqual(["DReel123.mp4"]);
  });
});

describe("showErrorToast", () => {
  it("strips signed queries from what it shows, copies and logs, whoever wrote the message", async () => {
    const signed = "https://scontent.example/v/a.jpg?oh=00_sig&oe=6AE81DC0";
    await showErrorToast("Could not fetch Instagram story", `bad media ${signed}`);

    type Action = { title: string; onAction: () => Promise<void> };
    const toast = toasts.at(-1) as FakeToast & { primaryAction: Action };
    await toast.primaryAction.onAction();
    const shown = [
      toast.message,
      vi.mocked(Clipboard.copy).mock.calls.at(-1)?.[0],
      vi.mocked(logger.error).mock.calls.at(-1),
    ];
    expect(JSON.stringify(shown)).toContain("https://scontent.example/v/a.jpg");
    expect(JSON.stringify(shown)).not.toContain("oh=00_sig");
  });
});

/** A post's media URLs, through the shared pipeline. */
async function getInstagramMediaURL(...args: Parameters<typeof resolveMedia>): Promise<string[] | null> {
  const items = await resolveMedia(...args);
  return items && items.map((item) => item.url);
}

describe("resolveMedia for a post", () => {
  const REF = { shortcode: "AbCdEfGhIjK", kind: "post" as const };
  const OPENED = "https://www.instagram.com/p/AbCdEfGhIjK/";
  // What Instagram sends a signed-out caller it is rate-limiting.
  const LIMITED = { status: 401, data: { message: "Please wait a few minutes before you try again.", status: "fail" } };
  const BUSY = { status: 503, data: "" };
  const OK = {
    status: 200,
    data: { data: { xdt_shortcode_media: { __typename: "XDTGraphImage", display_url: "https://cdn.example/a.jpg" } } },
  };

  const get = vi.mocked(axios.get);
  const browser = vi.mocked(readPostFromBrowser);
  const available = vi.mocked(browserExtensionAvailable);
  beforeEach(() => {
    get.mockReset();
    browser.mockReset().mockResolvedValue({ ok: false, reason: "no-tab" });
    available.mockReset().mockReturnValue(true);
    vi.mocked(Clipboard.copy).mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  async function run(toast?: { message?: string }, method: DownloadMethod = "browser") {
    const pending = getInstagramMediaURL(REF, { progressToast: toast as never, method });
    await vi.runAllTimersAsync();
    return pending;
  }

  const copyError = async () => {
    type Action = { title: string; onAction: () => Promise<void> };
    const toast = toasts.at(-1) as FakeToast & { primaryAction: Action; secondaryAction?: Action };
    await [toast.primaryAction, toast.secondaryAction].find((action) => action?.title === "Copy Error")?.onAction();
    return vi.mocked(Clipboard.copy).mock.calls.at(-1)?.[0] as string;
  };

  it("takes the media from the browser tab and never asks Instagram", async () => {
    browser.mockResolvedValue({ ok: true, media: [{ url: "https://scontent.example/a.mp4", kind: "video" }] });

    expect(await run()).toEqual(["https://scontent.example/a.mp4"]);
    expect(browser).toHaveBeenCalledWith(REF);
    expect(get).not.toHaveBeenCalled();
  });

  it("asks Instagram itself, for the bare shortcode, when the tab has only a stub", async () => {
    browser.mockResolvedValue({ ok: false, reason: "incomplete" });
    get.mockResolvedValue(OK);

    expect(await run()).toEqual(["https://cdn.example/a.jpg"]);
    expect(get).toHaveBeenCalledWith(
      "https://www.instagram.com/graphql/query",
      expect.objectContaining({ params: expect.objectContaining({ variables: '{"shortcode":"AbCdEfGhIjK"}' }) }),
    );
  });

  it("with Instagram first, asks Instagram before the browser, and falls back to the tab", async () => {
    get.mockResolvedValue(OK);
    expect(await run(undefined, "instagram")).toEqual(["https://cdn.example/a.jpg"]);
    expect(browser).not.toHaveBeenCalled();

    get.mockResolvedValue(LIMITED);
    browser.mockResolvedValue({ ok: true, media: [{ url: "https://scontent.example/b.jpg", kind: "image" }] });
    expect(await run(undefined, "instagram")).toEqual(["https://scontent.example/b.jpg"]);
    expect(toasts).toHaveLength(0);
  });

  it("never touches the browser when its extension is unavailable", async () => {
    available.mockReturnValue(false);
    get.mockResolvedValue(OK);
    expect(await run()).toEqual(["https://cdn.example/a.jpg"]);
    expect(browser).not.toHaveBeenCalled();
  });

  it("retries a rate limit and returns the media once Instagram answers", async () => {
    get.mockResolvedValueOnce(LIMITED).mockResolvedValueOnce(BUSY).mockResolvedValueOnce(OK);

    expect(await run({})).toEqual(["https://cdn.example/a.jpg"]);
    expect(get).toHaveBeenCalledTimes(3);
    expect(toasts).toHaveLength(0);
  });

  it("does not retry a post Instagram says is gone", async () => {
    get.mockResolvedValue({ status: 404, data: "" });
    expect(await run()).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
    expect((toasts.at(-1) as FakeToast).message).toContain("private or deleted");
  });

  it.each([
    ["not-found", true],
    ["incomplete", true],
    ["no-tab", true],
    ["error", true],
    ["unavailable", false],
  ] as const)("after a browser miss of %s, tells the user to open the post in a tab: %s", async (reason, hinted) => {
    browser.mockResolvedValue({ ok: false, reason });
    get.mockResolvedValue(LIMITED);

    expect(await run()).toBeNull();
    const message = (toasts.at(-1) as FakeToast).message ?? "";
    expect(message.startsWith("Open the post in a new browser tab")).toBe(hinted);
    expect(message).toContain("rate-limiting");
  });

  it("says what went wrong, and Copy Error carries the request, the reply and the tab", async () => {
    get.mockResolvedValue(LIMITED);

    expect(await run()).toBeNull();
    expect(get).toHaveBeenCalledTimes(3);
    expect((toasts.at(-1) as FakeToast).message).toContain("Instagram is rate-limiting requests from your network.");
    const copied = await copyError();
    expect(copied).toContain("graphql/query?doc_id=");
    expect(copied).toContain('{"shortcode":"AbCdEfGhIjK"}');
    expect(copied).toContain("HTTP 401");
    expect(copied).toContain("Please wait a few minutes");
    expect(copied).toContain("3 attempts");
    expect(copied).toContain("Browser tab: no-tab");
  });

  it("says a timeout in words, and keeps the raw error for Copy Error", async () => {
    available.mockReturnValue(false);
    get.mockRejectedValue(Object.assign(new Error("timeout of 15000ms exceeded"), { code: "ECONNABORTED" }));

    expect(await run()).toBeNull();
    expect((toasts.at(-1) as FakeToast).message).toBe("Instagram didn't answer within 15 seconds.");
    expect(await copyError()).toContain("timeout of 15000ms exceeded");
  });

  it("names an HTML error page by its status and keeps the page out of the message and log", async () => {
    const page = `<html><body>${"x".repeat(1000)}END_OF_PAGE</body></html>`;
    get.mockResolvedValue({ status: 502, data: page });

    expect(await run()).toBeNull();
    const toast = toasts.at(-1) as FakeToast;
    expect(toast.message).toContain("Instagram is having trouble (HTTP 502)");
    expect(toast.message).not.toContain("<html>");
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain("END_OF_PAGE");
  });

  it("strips signatures from a browser error before it reaches Copy Error or the log", async () => {
    browser.mockResolvedValue({
      ok: false,
      reason: "error",
      detail: "failed at https://scontent.example/x.jpg?oh=00_SECRET",
    });
    get.mockResolvedValue(LIMITED);

    expect(await run()).toBeNull();
    expect(await copyError()).not.toContain("SECRET");
    expect(JSON.stringify(vi.mocked(logger.log).mock.calls)).not.toContain("SECRET");
  });

  it("strips signatures from any URL in a reply before it reaches Copy Error", async () => {
    const escaped = "https:\\/\\/scontent.example\\/v\\/thumb.jpg?oh=00_SECRET&oe=6AE81DC0";
    get.mockResolvedValue({
      status: 502,
      data: `{"thumb":"${escaped}","plain":"https://scontent.example/x.jpg?oh=00_SECRET"}`,
    });

    expect(await run()).toBeNull();
    const copied = await copyError();
    expect(copied).toContain("scontent.example");
    expect(copied).not.toMatch(/SECRET|oe=/);
  });

  describe("⌘T while asking Instagram", () => {
    type Action = { title: string; shortcut?: unknown; onAction: () => Promise<void> };
    const FROM_TAB = { ok: true as const, media: [{ url: "https://cdn.example/tab.jpg", kind: "image" as const }] };

    /** A request that never answers until it is aborted. */
    function hangUntilAborted() {
      get.mockImplementation(
        (_url, options) =>
          new Promise((_, reject) =>
            (options?.signal as AbortSignal).addEventListener("abort", () =>
              reject(Object.assign(new Error("canceled"), { code: "ERR_CANCELED" })),
            ),
          ),
      );
    }

    function start(progress: object) {
      return getInstagramMediaURL(REF, { progressToast: progress as never, method: "browser" });
    }

    it("opens the post, then takes it from the new tab without waiting for Instagram", async () => {
      hangUntilAborted();
      const progress: { message?: string; primaryAction?: Action } = {};
      const pending = start(progress);
      await vi.advanceTimersByTimeAsync(0);

      expect(progress.primaryAction?.shortcut).toEqual({
        macOS: { modifiers: ["cmd"], key: "t" },
        Windows: { modifiers: ["ctrl"], key: "t" },
      });
      browser.mockResolvedValueOnce({ ok: false, reason: "not-found" }).mockResolvedValue(FROM_TAB);
      await progress.primaryAction?.onAction();
      expect(open).toHaveBeenCalledWith(OPENED);

      await vi.advanceTimersByTimeAsync(5000);
      expect(await pending).toEqual(["https://cdn.example/tab.jpg"]);
      expect((get.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true);
      expect(toasts).toHaveLength(0);
    });

    it("still uses the tab when Instagram fails first", async () => {
      get.mockResolvedValue(BUSY);
      const progress: { message?: string; primaryAction?: Action } = {};
      const pending = start(progress);
      await vi.advanceTimersByTimeAsync(0);
      browser.mockResolvedValueOnce({ ok: false, reason: "not-found" }).mockResolvedValue(FROM_TAB);
      await progress.primaryAction?.onAction();

      await vi.runAllTimersAsync();
      expect(await pending).toEqual(["https://cdn.example/tab.jpg"]);
      expect(toasts).toHaveLength(0);
    });

    it("stops watching 30 seconds after ⌘T, however slow each browser read is", async () => {
      get.mockResolvedValue(BUSY);
      const progress: { message?: string; primaryAction?: Action } = {};
      const pending = start(progress);
      await vi.advanceTimersByTimeAsync(0);
      // Every read now takes 4 s and never finds the post.
      browser.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: false, reason: "not-found" }), 4000)),
      );
      const pressed = Date.now();
      await progress.primaryAction?.onAction();

      await vi.runAllTimersAsync();
      expect(await pending).toBeNull();
      // The watch, a read still in flight at its deadline, and one last fallback read.
      expect(Date.now() - pressed).toBeLessThanOrEqual(30_000 + 2 * 4000);
    });

    it("after a ⌘T watch runs out, still takes the post from a tab that loads before Instagram gives up", async () => {
      // Each slow Instagram reply arrives 20 s later, so its three attempts outlast the 30 s watch.
      get.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(BUSY), 20_000)));
      const progress: { message?: string; primaryAction?: Action } = {};
      const pending = getInstagramMediaURL(REF, {
        progressToast: progress as never,
        method: "instagram",
      });
      await vi.advanceTimersByTimeAsync(0);
      const pressed = Date.now();
      browser.mockImplementation(async () =>
        Date.now() - pressed > 40_000 ? FROM_TAB : { ok: false, reason: "not-found" },
      );
      await progress.primaryAction?.onAction();

      await vi.runAllTimersAsync();
      expect(await pending).toEqual(["https://cdn.example/tab.jpg"]);
      expect(toasts).toHaveLength(0);
    });

    it("reports what the ⌘T watch last saw, not that the tab was never tried", async () => {
      available.mockReturnValue(true);
      get.mockResolvedValue(BUSY);
      const progress: { message?: string; primaryAction?: Action } = {};
      const pending = getInstagramMediaURL(REF, {
        progressToast: progress as never,
        method: "instagram",
      });
      await vi.advanceTimersByTimeAsync(0);
      browser.mockResolvedValue({ ok: false, reason: "incomplete" });
      await progress.primaryAction?.onAction();

      await vi.runAllTimersAsync();
      expect(await pending).toBeNull();
      expect(await copyError()).toContain("Browser tab: incomplete");
    });

    it("offers nothing when the browser extension is unavailable", async () => {
      get.mockResolvedValue(OK);
      browser.mockResolvedValue({ ok: false, reason: "unavailable" });
      const progress: { message?: string; primaryAction?: Action } = {};
      await run(progress);
      expect(progress.primaryAction).toBeUndefined();

      available.mockReturnValue(false);
      const missing: { message?: string; primaryAction?: Action } = {};
      await run(missing, "instagram");
      expect(missing.primaryAction).toBeUndefined();
    });
  });
});

describe("handOff", () => {
  it("reports a launch Raycast refuses instead of letting it escape the command", async () => {
    vi.mocked(launchCommand).mockRejectedValueOnce(new Error("Command is disabled"));

    await expect(
      handOff("https://www.instagram.com/stories/highlights/12345678901234567/", "download-instagram-media"),
    ).resolves.toBe(true);
    expect(toasts.at(-1)).toMatchObject({ title: "Couldn't Open the Right Command", message: "Command is disabled" });
  });

  it("launches the command that downloads the link, and declines links it can't route", async () => {
    vi.mocked(launchCommand).mockClear().mockResolvedValue(undefined);
    const story = "https://www.instagram.com/stories/example_user/1234567890/";
    expect(await handOff(story, "download-instagram-media")).toBe(true);
    expect(launchCommand).toHaveBeenCalledWith({
      name: "download-instagram-story",
      type: "userInitiated",
      arguments: { instagramUrl: story },
    });
    expect(await handOff("https://www.instagram.com/example_user/", "download-instagram-media")).toBe(false);
    expect(await handOff(story, "download-instagram-story")).toBe(false);
  });
});

describe("resolveMedia for a story", () => {
  const STORY = { kind: "story" as const, user: "example_user", storyId: "2" };
  const OPENED = "https://www.instagram.com/stories/example_user/2/";
  const FROM_TAB = {
    ok: true as const,
    items: [
      { id: "2", url: "https://cdn.example/s.mp4", kind: "video" as const, thumbnail: "https://cdn.example/p.jpg" },
    ],
  };
  type Action = { title: string; shortcut?: unknown; onAction: () => Promise<void> };

  const reel = vi.mocked(readReelFromBrowser);
  const get = vi.mocked(axios.get);
  beforeEach(() => {
    reel.mockReset().mockResolvedValue({ ok: false, reason: "no-tab" });
    get.mockReset();
    vi.mocked(browserExtensionAvailable).mockReset().mockReturnValue(true);
    vi.mocked(open).mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("reads the story from the browser whatever the method, named after the story, and never asks Instagram", async () => {
    reel.mockResolvedValue(FROM_TAB);
    let result: unknown = "pending";
    void resolveMedia(STORY, { method: "instagram" }).then((items) => (result = items));
    // Straight from the tab: no waiting, even with Instagram first.
    await vi.advanceTimersByTimeAsync(0);
    expect(result).toEqual([{ url: "https://cdn.example/s.mp4", name: "story-2" }]);
    expect(get).not.toHaveBeenCalled();
  });

  it("without a tab, offers ⌘T like a post does, and takes the story from the tab it opens", async () => {
    const progress: { message?: string; primaryAction?: Action } = {};
    const pending = resolveMedia(STORY, { progressToast: progress as never, method: "browser" });
    await vi.advanceTimersByTimeAsync(0);

    expect(progress.primaryAction?.shortcut).toEqual({
      macOS: { modifiers: ["cmd"], key: "t" },
      Windows: { modifiers: ["ctrl"], key: "t" },
    });
    expect(progress.message).toContain("⌘T");
    reel.mockResolvedValue(FROM_TAB);
    await progress.primaryAction?.onAction();
    expect(open).toHaveBeenCalledWith(OPENED);

    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toEqual([{ url: "https://cdn.example/s.mp4", name: "story-2" }]);
    expect(get).not.toHaveBeenCalled();
    // The 30 s wait for ⌘T ended with it; nothing is left to fire later.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("takes the story from a second ⌘T even while the first watch's last check is still running", async () => {
    const miss = { ok: false as const, reason: "not-found" as const };
    let calls = 0;
    // Call 1 is the first read, 2–20 the first watch; call 21, the check after it, is slow.
    reel.mockImplementation(async () => {
      calls++;
      if (calls === 21) return new Promise((resolve) => setTimeout(() => resolve(miss), 3000));
      return calls > 21 ? FROM_TAB : miss;
    });
    const progress: { message?: string; primaryAction?: Action } = {};
    const pending = resolveMedia(STORY, { progressToast: progress as never, method: "browser" });
    await vi.advanceTimersByTimeAsync(0);
    await progress.primaryAction?.onAction();
    await vi.advanceTimersByTimeAsync(29_000);
    await progress.primaryAction?.onAction();

    await vi.runAllTimersAsync();
    expect(await pending).toEqual([{ url: "https://cdn.example/s.mp4", name: "story-2" }]);
    expect(toasts).toHaveLength(0);
  });

  it("gives up after waiting, telling the user to open the story", async () => {
    let done = false;
    const pending = resolveMedia(STORY, { progressToast: {} as never, method: "browser" }).finally(() => (done = true));
    await vi.advanceTimersByTimeAsync(29_000);
    expect(done).toBe(false);
    await vi.runAllTimersAsync();
    expect(await pending).toBeNull();
    expect((toasts.at(-1) as FakeToast).message).toContain("Open the story in a new browser tab");
  });

  it("without the browser extension, fails at once and offers to install it", async () => {
    vi.mocked(browserExtensionAvailable).mockReturnValue(false);
    const pending = resolveMedia(STORY, { progressToast: {} as never, method: "browser" });
    await vi.advanceTimersByTimeAsync(0);
    expect(await pending).toBeNull();
    const toast = toasts.at(-1) as FakeToast & { primaryAction?: Action };
    expect(toast.message).toContain("needs the Raycast browser extension");
    expect(toast.primaryAction?.title).toBe("Install Browser Extension");
  });
});
