import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir, homedir } from "os";
import { join } from "path";
import { mockPreferences } from "../__mocks__/@raycast/api";
import { downloadFile, expandHome, sanitizeFilename, uniquePath } from "../../src/lib/download";
import { formatBytes, truncate } from "../../src/lib/format";

const TOKEN = "0123456789abcdef0123456789abcdef";
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "webeep-test-"));
  mockPreferences.sessionCookie = TOKEN;
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("expandHome", () => {
  it("expands ~ and ~/", () => {
    expect(expandHome("~")).toBe(homedir());
    expect(expandHome("~/Downloads")).toBe(join(homedir(), "Downloads"));
    expect(expandHome("/tmp/x")).toBe("/tmp/x");
  });
});

describe("sanitizeFilename", () => {
  it("replaces separators and control characters", () => {
    expect(sanitizeFilename("a/b\\c:d\te.pdf")).toBe("a_b_c_d_e.pdf");
    expect(sanitizeFilename("   ")).toBe("download");
  });
});

describe("uniquePath", () => {
  it("adds a numeric suffix when the file exists", async () => {
    await writeFile(join(dir, "slides.pdf"), "x");
    await writeFile(join(dir, "slides (1).pdf"), "x");
    expect(await uniquePath(dir, "slides.pdf")).toBe(join(dir, "slides (2).pdf"));
    expect(await uniquePath(dir, "other.pdf")).toBe(join(dir, "other.pdf"));
  });
});

describe("downloadFile", () => {
  it("streams the response to disk using the token URL", async () => {
    const fetchMock = vi.fn(async () => new Response("pdf-bytes", { headers: { "content-type": "application/pdf" } }));
    const url = "https://webeep.polimi.it/webservice/pluginfile.php/1/mod_folder/content/1/slides.pdf?forcedownload=1";
    const path = await downloadFile(url, "slides.pdf", dir, fetchMock as unknown as typeof fetch);
    expect(path).toBe(join(dir, "slides.pdf"));
    expect(await readFile(path, "utf8")).toBe("pdf-bytes");
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(`${url}&token=${TOKEN}`);
  });

  it("reports Moodle JSON errors instead of saving them", async () => {
    const fetchMock = vi.fn(
      async () => new Response('{"error":"Invalid token"}', { headers: { "content-type": "application/json" } }),
    );
    await expect(
      downloadFile(
        "https://webeep.polimi.it/webservice/pluginfile.php/x.pdf",
        "x.pdf",
        dir,
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toThrow("refused the download");
  });
});

describe("format", () => {
  it("formats byte sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(300074)).toBe("293 KB");
    expect(formatBytes(5242880)).toBe("5.0 MB");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 GB");
  });

  it("truncates long text with an ellipsis", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
  });
});
