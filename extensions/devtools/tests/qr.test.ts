import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import QRCode from "qrcode";

const runFile = promisify(execFile);
const helper = path.resolve("assets/qr-helper");

test(
  "generated QR PNG is recognized by the native Vision helper",
  { skip: process.platform !== "darwin" },
  async () => {
    await access(helper);
    const directory = await mkdtemp(path.join(os.tmpdir(), "devtools-qr-test-"));
    try {
      for (const url of ["https://example.com?x=1&redirect=https%3A%2F%2Fa.com", "myapp://page?name=你好&emoji=👋"]) {
        const file = path.join(directory, "code.png");
        await QRCode.toFile(file, url, { width: 512, margin: 4, errorCorrectionLevel: "M" });
        const { stdout } = await runFile(helper, ["decode-file", file], { timeout: 15_000 });
        assert.deepEqual(JSON.parse(stdout).codes, [url]);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test("a non-QR image reports no QR code", { skip: process.platform !== "darwin" }, async () => {
  await assert.rejects(
    runFile(helper, ["decode-file", path.resolve("assets/devtools-toolbox.png")]),
    /No QR code found/,
  );
});
