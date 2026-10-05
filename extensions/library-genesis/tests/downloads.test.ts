import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import { getUrlFromDownloadPage } from "../src/utils/api";
import { downloadBookFile, downloadBookFromMirrors } from "../src/utils/api/downloads";
import { mirrors } from "../src/utils/api/mirrors";

const epub = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(100000, 42)]);
const md5 = createHash("md5").update(epub).digest("hex");
const html = Buffer.from("<!DOCTYPE html><html><title>Welcome to nginx!</title></html>".padEnd(638));
const requests: { path: string; ua?: string; referer?: string; port?: number }[] = [];
let directory: string;
let baseUrl: string;
let healthyUrl: string;
let filename = 0;
const makeServer = (healthy: boolean) =>
  createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    requests.push({
      path: url.pathname,
      ua: request.headers["user-agent"],
      referer: request.headers.referer,
      port: request.socket.localPort,
    });
    const mode = url.searchParams.get("case") ?? "valid";
    if (url.pathname === "/index.php") {
      response.setHeader("content-type", "text/html");
      response.end('<table id="tablelibgen"><tbody></tbody></table>');
    } else if (url.pathname === "/ads.php") {
      response.setHeader("content-type", "text/html");
      if (mode === "page-redirect") response.writeHead(302, { Location: `${healthyUrl}/ads.php` }).end();
      else if (mode === "missing") response.end('<div id="main"><a href="/report">Report an error</a></div>');
      else if (mode === "placeholder") response.end(html);
      else if (mode === "unsafe") response.end('<div id="main"><a href="javascript:alert(1)">GET</a></div>');
      else {
        const href = mode === "absolute" ? `${baseUrl}/book?case=valid` : `book?case=${mode}&key=secret%26value`;
        response.end(`<div id="main"><a href="/report">Report</a><a href="${href}"><h2>GET</h2></a></div>`);
      }
    } else if (url.pathname === "/book") {
      response.setHeader("content-type", "application/octet-stream");
      if (mode === "status") response.writeHead(503).end(epub);
      else if (mode === "empty") response.end();
      else if (mode === "html" || (mode === "failover" && !healthy)) {
        response.setHeader("content-type", "text/html");
        response.end(html);
      } else if (mode === "disguised") response.end(html);
      else if (mode === "chunked-html") {
        response.write(html.subarray(0, 2));
        setTimeout(() => response.end(html.subarray(2)), 10);
      } else if (mode === "wrong-type") response.end("not an epub");
      else if (mode === "hanging") response.write(epub.subarray(0, 2000));
      else if (mode === "slow") {
        response.write(epub.subarray(0, 2000));
        setTimeout(() => response.end(epub.subarray(2000)), 100);
      } else if (mode === "truncated") {
        response.setHeader("content-length", epub.length + 10);
        response.end(epub);
        setTimeout(() => response.destroy(), 10);
      } else if (mode === "redirect") response.writeHead(302, { Location: "/book?case=valid" }).end();
      else if (mode === "pdf") response.end("%PDF-1.7\nexample");
      else response.end(epub);
    } else response.writeHead(404).end();
  });
const server = makeServer(false);
const healthyServer = makeServer(true);
const path = () => join(directory, `book-${filename++}.epub`);
const options = () => ({ referer: `${baseUrl}/ads.php?md5=${md5}`, extension: "epub", md5 });

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "libgen-download-tests-"));
  for (const service of [server, healthyServer]) {
    await new Promise<void>((resolve) => service.listen(0, "127.0.0.1", resolve));
  }
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  healthyUrl = `http://127.0.0.1:${(healthyServer.address() as AddressInfo).port}`;
});
after(async () => {
  for (const service of [server, healthyServer]) {
    service.closeAllConnections();
    await new Promise<void>((resolve, reject) => service.close((error) => (error ? reject(error) : resolve())));
  }
  await rm(directory, { recursive: true, force: true });
});

test("download links preserve relative and absolute URLs, query keys and explicit GET selection", async () => {
  const relative = await getUrlFromDownloadPage(`${baseUrl}/ads.php`);
  assert.equal(relative, `${baseUrl}/book?case=valid&key=secret%26value`);
  assert.equal(await getUrlFromDownloadPage(`${baseUrl}/ads.php?case=absolute`), `${baseUrl}/book?case=valid`);
  assert.equal(
    await getUrlFromDownloadPage(`${baseUrl}/ads.php?case=page-redirect`),
    `${healthyUrl}/book?case=valid&key=secret%26value`,
  );
  for (const mode of ["missing", "placeholder"]) {
    await assert.rejects(getUrlFromDownloadPage(`${baseUrl}/ads.php?case=${mode}`), /did not provide a GET link/);
  }
  await assert.rejects(getUrlFromDownloadPage(`${baseUrl}/ads.php?case=unsafe`), /invalid GET link/);
});

test("valid downloads follow redirects, send the required headers and match the book checksum", async () => {
  const destination = path();
  await downloadBookFile(`${baseUrl}/book?case=redirect`, destination, options());
  assert.deepEqual(await readFile(destination), epub);
  const request = requests.at(-1)!;
  assert.equal(request.ua, "Raycast-Library-Genesis");
  assert.equal(request.referer, options().referer);
  assert.ok(!(await readdir(directory)).some((name) => name.endsWith(".part")));
});

test("638-byte placeholders, disguised or split HTML, HTTP failures, empty and wrong-format files are never saved", async () => {
  const original = await readdir(directory);
  for (const mode of ["html", "disguised", "chunked-html", "status", "empty", "wrong-type", "truncated"]) {
    await assert.rejects(downloadBookFile(`${baseUrl}/book?case=${mode}`, path(), options()));
    assert.deepEqual(await readdir(directory), original, mode);
  }
});

test("checksum mismatches remove the partial file, and PDF signatures are validated", async () => {
  const original = await readdir(directory);
  await assert.rejects(downloadBookFile(`${baseUrl}/book`, path(), { ...options(), md5: "0".repeat(32) }), /checksum/);
  assert.deepEqual(await readdir(directory), original);
  const pdf = path();
  await downloadBookFile(`${baseUrl}/book?case=pdf`, pdf, { referer: baseUrl, extension: "pdf" });
  assert.equal((await readFile(pdf)).toString(), "%PDF-1.7\nexample");
  await assert.rejects(downloadBookFile(`${baseUrl}/book`, path(), { referer: baseUrl, extension: "pdf" }), /PDF file/);
});

test("cancellation and timeout cover response streaming and leave no partial or final book", async () => {
  const original = await readdir(directory);
  const controller = new AbortController();
  const pending = downloadBookFile(`${baseUrl}/book?case=slow`, path(), { ...options(), signal: controller.signal });
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(pending, (error: Error) => error.name === "AbortError");
  await assert.rejects(
    downloadBookFile(`${baseUrl}/book?case=hanging`, path(), { ...options(), timeoutMs: 20 }),
    /timed out/,
  );
  controller.abort();
  const count = requests.length;
  await assert.rejects(downloadBookFile(`${baseUrl}/book`, path(), { ...options(), signal: controller.signal }));
  assert.equal(requests.length, count);
  assert.deepEqual(await readdir(directory), original);
});

test("an existing destination is preserved instead of overwritten", async () => {
  const destination = path();
  await writeFile(destination, "existing book");
  await assert.rejects(downloadBookFile(`${baseUrl}/book`, destination, options()), { code: "EEXIST" });
  assert.equal((await readFile(destination)).toString(), "existing book");
  assert.ok(!(await readdir(directory)).some((name) => name.endsWith(".part")));
});

test("long book filenames do not make the temporary filename exceed the filesystem limit", async () => {
  const destination = join(directory, `${"x".repeat(240)}.epub`);
  await downloadBookFile(`${baseUrl}/book`, destination, options());
  assert.deepEqual(await readFile(destination), epub);
});

test("a search-healthy mirror with broken downloads is replaced using a fresh GET link for the same MD5", async () => {
  const original = mirrors.slice();
  try {
    mirrors.splice(
      0,
      mirrors.length,
      { baseUrl, parse: original[0].parse },
      { baseUrl: healthyUrl, parse: original[0].parse },
    );
    const destination = path();
    const count = requests.length;
    await downloadBookFromMirrors(`${baseUrl}/ads.php?md5=${md5}&case=failover`, destination, options());
    assert.deepEqual(await readFile(destination), epub);
    // Both download pages are resolved; no GET key is reused on another origin.
    assert.equal(requests.slice(count).filter((request) => request.path === "/ads.php").length, 2);
    assert.equal(requests.at(-1)!.referer, `${healthyUrl}/ads.php?md5=${md5}&case=failover`);
  } finally {
    mirrors.splice(0, mirrors.length, ...original);
  }
});

test("exhausted download mirrors report failure without saving a placeholder", async (context) => {
  const original = mirrors.slice();
  context.mock.method(console, "error", () => {});
  const files = await readdir(directory);
  try {
    mirrors.splice(0, mirrors.length, { baseUrl, parse: original[0].parse });
    await assert.rejects(
      downloadBookFromMirrors(`${baseUrl}/ads.php?md5=${md5}&case=html`, path(), options()),
      /Download failed after trying 1 mirror.*HTML/,
    );
    assert.deepEqual(await readdir(directory), files);
  } finally {
    mirrors.splice(0, mirrors.length, ...original);
  }
});

test("cancelled downloads do not discover or attempt another mirror", async () => {
  const count = requests.length;
  const controller = new AbortController();
  const pending = downloadBookFromMirrors(`${baseUrl}/ads.php?md5=${md5}&case=slow`, path(), {
    ...options(),
    signal: controller.signal,
  });
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(pending, (error: Error) => error.name === "AbortError");
  assert.ok(!requests.slice(count).some((request) => request.path === "/index.php"));
});

test("40 concurrent downloads preserve every byte and clean up rejected responses", async () => {
  const jobs = Array.from({ length: 40 }, (_, i) => ({ mode: i % 4 ? "valid" : "disguised", destination: path() }));
  const results = await Promise.allSettled(
    jobs.map(({ mode, destination }) => downloadBookFile(`${baseUrl}/book?case=${mode}`, destination, options())),
  );
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 30);
  for (let i = 0; i < jobs.length; i++) {
    if (results[i].status === "fulfilled") assert.deepEqual(await readFile(jobs[i].destination), epub);
    else await assert.rejects(readFile(jobs[i].destination), { code: "ENOENT" });
  }
  assert.ok(!(await readdir(directory)).some((name) => name.endsWith(".part")));
});
