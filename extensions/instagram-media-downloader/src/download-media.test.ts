import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// `vi.mock` calls below are hoisted above this import, so it loads against the fakes.
import { downloadMediaSet, handleDownload, runExclusive } from "./download-media";

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
}));
vi.mock("@chrismessina/raycast-logger", () => ({ logger: { log: vi.fn(), error: vi.fn() } }));

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
