import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getLocalIp, generateQRCode, startReceiveServer, startSendServer } from "./qrcp";
import fs from "fs";
import path from "path";
import os from "os";
import { PassThrough } from "stream";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForFiles(dir: string, expected: number) {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (fs.existsSync(dir)) {
      const entries = fs.readdirSync(dir);
      if (entries.length >= expected) {
        return entries.map((entry) => path.join(dir, entry));
      }
    }
    await sleep(25);
  }
  throw new Error(`Timed out waiting for files in ${dir}`);
}

describe("getLocalIp", () => {
  it("should return a non-internal IPv4 address or localhost", () => {
    const ip = getLocalIp();
    expect(typeof ip).toBe("string");
    expect(ip.length).toBeGreaterThan(0);
  });
});

describe("generateQRCode", () => {
  it("should generate a data URL for a QR code", async () => {
    const url = "http://localhost:1234";
    const qr = await generateQRCode(url);
    expect(qr.startsWith("data:image/png;base64,")).toBe(true);
  });
});

describe("startReceiveServer", () => {
  let tempRoot: string | undefined;
  let downloadDir: string | undefined;
  let serverObj: Awaited<ReturnType<typeof startReceiveServer>> | undefined;

  beforeEach(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "qrcp-recv-"));
    downloadDir = path.join(tempRoot, "downloads");
    serverObj = await startReceiveServer({ downloadDir });
  });

  afterEach(async () => {
    if (serverObj) {
      await serverObj.close();
      serverObj = undefined;
    }
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
      downloadDir = undefined;
    }
    vi.restoreAllMocks();
  });

  it("writes uploaded files to the target directory", async () => {
    if (!serverObj || !downloadDir) {
      throw new Error("Server not initialized");
    }

    let receivedName: string | undefined;
    serverObj.onFileReceived?.((name) => {
      receivedName = name;
    });

    const res = await fetch(serverObj.url, {
      method: "POST",
      headers: { "x-filename": "testfile.txt" },
      body: "hello world",
    });
    expect(res.status).toBe(200);
    await res.text();

    const files = await waitForFiles(downloadDir, 1);
    expect(files).toHaveLength(1);
    expect(fs.readFileSync(files[0], "utf8")).toBe("hello world");
    expect(path.basename(files[0]).endsWith("testfile.txt")).toBe(true);
    expect(receivedName).toBe("testfile.txt");
  });

  it("sanitizes unsafe filenames", async () => {
    if (!serverObj || !downloadDir) {
      throw new Error("Server not initialized");
    }

    const res = await fetch(serverObj.url, {
      method: "POST",
      headers: { "x-filename": "..%2F..%2Fevil.txt" },
      body: "harmful",
    });
    expect(res.status).toBe(200);
    await res.text();

    const files = await waitForFiles(downloadDir, 1);
    const stored = path.basename(files[0]);
    expect(stored.includes("..")).toBe(false);
    expect(stored.endsWith("evil.txt")).toBe(true);
  });

  it("returns 500 when the file cannot be written", async () => {
    if (!serverObj || !downloadDir) {
      throw new Error("Server not initialized");
    }

    const streamSpy = vi.spyOn(fs, "createWriteStream").mockImplementation(() => {
      const stream = new PassThrough();
      queueMicrotask(() => {
        stream.emit("error", new Error("fail"));
      });
      return stream as unknown as fs.WriteStream;
    });

    const res = await fetch(serverObj.url, {
      method: "POST",
      headers: { "x-filename": "broken.txt" },
      body: "oops",
    });
    expect(res.status).toBe(500);
    await res.text();

    const entries = fs.existsSync(downloadDir) ? fs.readdirSync(downloadDir) : [];
    expect(entries.length).toBe(0);
    streamSpy.mockRestore();
  });
});

describe("startSendServer", () => {
  let tempRoot: string | undefined;
  let filePath: string | undefined;
  let serverObj: Awaited<ReturnType<typeof startSendServer>> | undefined;

  beforeEach(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "qrcp-send-"));
    filePath = path.join(tempRoot, "sendfile.txt");
    fs.writeFileSync(filePath, "send this");
    serverObj = await startSendServer([filePath]);
  });

  afterEach(async () => {
    if (serverObj) {
      await serverObj.close();
      serverObj = undefined;
    }
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
      filePath = undefined;
    }
    vi.restoreAllMocks();
  });

  it("serves a download page with file links", async () => {
    if (!serverObj) {
      throw new Error("Server not initialized");
    }

    const res = await fetch(serverObj.url);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("sendfile.txt");
  });

  it("streams files and triggers the download callback", async () => {
    if (!serverObj) {
      throw new Error("Server not initialized");
    }

    let downloaded = false;
    serverObj.onDownload?.(() => {
      downloaded = true;
    });

    const res = await fetch(new URL("/file/0", serverObj.url));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("send this");
    await vi.waitFor(() => {
      expect(downloaded).toBe(true);
    });
  });

  it("returns 404 for unknown file indices", async () => {
    if (!serverObj) {
      throw new Error("Server not initialized");
    }

    const res = await fetch(new URL("/file/999", serverObj.url));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the file is missing on disk", async () => {
    if (!tempRoot) {
      throw new Error("Temp root not initialized");
    }

    const missingPath = path.join(tempRoot, "missing.txt");
    const server = await startSendServer([missingPath]);
    const res = await fetch(new URL("/file/0", server.url));
    expect(res.status).toBe(404);
    await server.close();
  });
});
