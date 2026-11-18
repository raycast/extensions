import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import QRCode from "qrcode";
import { qrImageDataUrl, qrPreviewMarkdown } from "../src/lib/qr-preview";

const runFile = promisify(execFile);

test("QR preview embeds a readable PNG even when its path contains spaces and special characters", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "devtools Application Support "));
  try {
    const file = path.join(directory, "二维码 # ? (preview).png");
    const url = "myapp://page?name=二维码&redirect=https%3A%2F%2Fa.com&x=1";
    await QRCode.toFile(file, url, { width: 512, margin: 4, errorCorrectionLevel: "M" });
    const source = await qrImageDataUrl(file);
    const embedded = Buffer.from(source.slice(source.indexOf(",") + 1), "base64");
    assert.deepEqual(embedded, await readFile(file));
    assert.equal(/\s/.test(source), false);
    assert.equal(qrPreviewMarkdown(source, url).includes(directory), false);
    if (process.platform === "darwin") {
      const decodedFile = path.join(directory, "embedded.png");
      await writeFile(decodedFile, embedded);
      const { stdout } = await runFile(path.resolve("assets/qr-helper"), ["decode-file", decodedFile]);
      assert.deepEqual(JSON.parse(stdout).codes, [url]);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
