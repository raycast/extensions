import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

import { spawn } from "node:child_process";
import {
  buildMonolithArgs,
  reserveWebpagePath,
  webpageFilename,
  runMonolithSave,
  webpageOutputPath,
} from "../src/lib/monolith";

function fakeChild() {
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: () => void };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn(() => child.emit("close", null));
  return child;
}

describe("buildMonolithArgs", () => {
  it("builds a Complete-mode command without --no-js", () => {
    expect(
      buildMonolithArgs({
        url: "https://example.com/x",
        outputPath: "/Downloads/example.com-x.html",
        noJavaScript: false,
      }),
    ).toEqual(["--output", "/Downloads/example.com-x.html", "https://example.com/x"]);
  });

  it("adds --no-js for Lightweight mode", () => {
    expect(buildMonolithArgs({ url: "https://example.com/x", outputPath: "/d/page.html", noJavaScript: true })).toEqual(
      ["--output", "/d/page.html", "--no-js", "https://example.com/x"],
    );
  });
});

describe("webpageFilename", () => {
  it("derives a name from host and path", () => {
    expect(webpageFilename("https://en.wikipedia.org/wiki/Raycast")).toBe("en.wikipedia.org-wiki-Raycast.html");
  });

  it("includes the query string", () => {
    expect(webpageFilename("https://news.ycombinator.com/item?id=12345")).toBe(
      "news.ycombinator.com-item-id-12345.html",
    );
  });

  it("strips a leading www. and a bare-host trailing slash", () => {
    expect(webpageFilename("https://www.example.com/")).toBe("example.com.html");
  });

  it("accepts a URL with no protocol", () => {
    expect(webpageFilename("example.com/article")).toBe("example.com-article.html");
  });

  it("handles a protocol-less URL whose host starts with http", () => {
    expect(webpageFilename("httpbin.org/get")).toBe("httpbin.org-get.html");
  });

  it("falls back to webpage.html for an unparseable URL", () => {
    expect(webpageFilename("not a url")).toBe("webpage.html");
  });
});

describe("runMonolithSave", () => {
  it("resolves with the output path on a zero exit", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runMonolithSave("/opt/homebrew/bin/monolith", {
      url: "https://example.com/x",
      outputPath: "/Downloads/example.com-x.html",
      noJavaScript: false,
    });

    child.emit("close", 0);

    await expect(promise).resolves.toEqual({ filePath: "/Downloads/example.com-x.html" });
  });

  it("rejects with the stderr text on a non-zero exit", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runMonolithSave("/opt/homebrew/bin/monolith", {
      url: "https://example.com/bad",
      outputPath: "/d/bad.html",
      noJavaScript: false,
    });

    child.stderr.emit("data", Buffer.from("could not retrieve target document"));
    child.emit("close", 1);

    await expect(promise).rejects.toThrow("could not retrieve target document");
  });

  it("rejects when the process emits an error event", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runMonolithSave("/nonexistent/monolith", {
      url: "https://example.com/x",
      outputPath: "/d/page.html",
      noJavaScript: false,
    });

    child.emit("error", new Error("spawn ENOENT"));

    await expect(promise).rejects.toThrow("spawn ENOENT");
  });

  it("closes stdin so monolith cannot block on an interactive prompt", () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    runMonolithSave("/monolith", { url: "https://example.com/x", outputPath: "/d/page.html", noJavaScript: false });

    expect(spawn).toHaveBeenCalledWith(
      "/monolith",
      expect.any(Array),
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
  });

  it("kills monolith and rejects when no output arrives within options.idleMs (CDN stall)", async () => {
    vi.useFakeTimers();
    try {
      const child = fakeChild();
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

      const promise = runMonolithSave("/monolith", {
        url: "https://example.com/x",
        outputPath: "/d/page.html",
        noJavaScript: false,
        idleMs: 5_000,
      });
      const assertion = expect(promise).rejects.toThrow(/no output|stuck|killed/i);

      await vi.advanceTimersByTimeAsync(6_000);

      await assertion;
      expect(child.kill).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("webpageOutputPath", () => {
  it("names the file after the page, numbered instead of overwriting an earlier save", () => {
    const taken = new Set(["/out/example.com-news.html"]);
    expect(webpageOutputPath("/out", "https://example.com/news", () => false)).toBe("/out/example.com-news.html");
    expect(webpageOutputPath("/out", "https://example.com/news", (p) => taken.has(p))).toBe(
      "/out/example.com-news (2).html",
    );
  });
});

describe("reserveWebpagePath", () => {
  it("takes the name at once, so two saves of one page started together get different files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "monolith-"));
    try {
      const first = reserveWebpagePath(dir, "https://example.com/a");
      const second = reserveWebpagePath(dir, "https://example.com/a");
      expect(path.basename(first)).toBe("example.com-a.html");
      expect(path.basename(second)).toBe("example.com-a (2).html");
      expect(fs.existsSync(first) && fs.existsSync(second)).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("steps past a broken symlink with the name instead of retrying it forever", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "monolith-"));
    try {
      fs.symlinkSync(path.join(dir, "gone.html"), path.join(dir, "example.com-a.html"));
      expect(path.basename(reserveWebpagePath(dir, "https://example.com/a"))).toBe("example.com-a (2).html");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("removes the reserved empty file when the save fails", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "monolith-"));
    try {
      const outputPath = reserveWebpagePath(dir, "https://example.com/bad");
      const child = fakeChild();
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);
      const promise = runMonolithSave("/opt/homebrew/bin/monolith", {
        url: "https://example.com/bad",
        outputPath,
        noJavaScript: false,
      });
      child.emit("close", 1);
      await expect(promise).rejects.toThrow();
      expect(fs.existsSync(outputPath)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
