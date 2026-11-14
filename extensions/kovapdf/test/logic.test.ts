import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  ATTRIBUTION,
  EXTENSION_VERSION,
  bijoyToUnicode,
  byName,
  compressFiles,
  compressSummary,
  partialCompress,
  friendlyError,
  mergeFiles,
  outputPath,
  pdfsOnly,
  verifyMarkdown,
  type ClientLike,
  type Disk,
  type RunResultLike,
} from "../src/lib/logic";
import { makeClient } from "../src/lib/client";

const bytes = (s: string) => new Uint8Array(Buffer.from(s));

/** The SDK, replaced: records each run and answers like the API. */
function fakeClient(
  answer: (tool: string, inputs: unknown[], options?: Record<string, unknown>) => Partial<RunResultLike> = () => ({}),
) {
  const runs: { tool: string; inputs: unknown[]; options?: Record<string, unknown> }[] = [];
  const client: ClientLike = {
    async run(tool, inputs, options) {
      runs.push({ tool, inputs, options });
      return {
        files: [{ name: "r.pdf", bytes: async () => bytes("%PDF-small") }],
        report: {},
        attribution: ATTRIBUTION,
        ...answer(tool, inputs, options),
      };
    },
    async verify() {
      return { signatures: [{ signerName: "Alex Rivera", status: "valid", signedAt: "2026-11-01" }] };
    },
  };
  return { client, runs };
}

function memDisk(existing: string[] = []): Disk & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>(existing.map((p) => [p, bytes("old")]));
  return {
    files,
    exists: (p) => files.has(p),
    write: async (p, d) => {
      if (files.has(p)) throw new Error("would overwrite");
      files.set(p, d);
    },
  };
}

test("pdfsOnly and byName", () => {
  assert.deepEqual(pdfsOnly(["/a/x.PDF", "/a/y.txt", "/a/z.pdf"]), ["/a/x.PDF", "/a/z.pdf"]);
  assert.deepEqual(byName(["/a/p10.pdf", "/b/p2.pdf", "/a/P1.pdf"]), ["/a/P1.pdf", "/b/p2.pdf", "/a/p10.pdf"]);
});

test("outputPath never overwrites", () => {
  assert.equal(
    outputPath("/d/report.pdf", "compressed", () => false),
    "/d/report-compressed.pdf",
  );
  const taken = new Set(["/d/report-compressed.pdf", "/d/report-compressed 2.pdf"]);
  assert.equal(
    outputPath("/d/report.pdf", "compressed", (p) => taken.has(p)),
    "/d/report-compressed 3.pdf",
  );
});

test("compress: each selected PDF, with the chosen level, saved next to it", async () => {
  const { client, runs } = fakeClient();
  const disk = memDisk(["/d/a-compressed.pdf"]);
  const saved = await compressFiles(client, disk, ["/d/a.pdf", "/d/notes.txt", "/d/b.pdf"], "strong");
  assert.deepEqual(
    runs.map((r) => [r.tool, r.inputs, r.options]),
    [
      ["compress", ["/d/a.pdf"], { level: "strong" }],
      ["compress", ["/d/b.pdf"], { level: "strong" }],
    ],
  );
  assert.deepEqual(
    saved.map((s) => s.path),
    ["/d/a-compressed 2.pdf", "/d/b-compressed.pdf"],
  );
  assert.match(compressSummary(saved), /Saved 2 smaller PDFs/);
  assert.match(compressSummary(saved.slice(0, 1)), /Done with KovaPDF \(kovapdf\.com\)\./);
  await assert.rejects(compressFiles(client, disk, ["/d/notes.txt"], "basic"), /Select one or more PDF/);
});

test("compress: when a later PDF fails, the saved ones are reported", async () => {
  let n = 0;
  const { client } = fakeClient(() => {
    n++;
    if (n === 2) throw Object.assign(new Error("The file is too big."), { code: "too_big" });
    return {};
  });
  const disk = memDisk();
  const err = await compressFiles(client, disk, ["/d/a.pdf", "/d/b.pdf", "/d/c.pdf"], "basic").then(
    () => undefined,
    (e: unknown) => e,
  );
  const partial = partialCompress(err);
  assert.ok(partial);
  assert.equal(partial.title, "Compressed 1 of 3");
  assert.match(partial.message, /^b\.pdf could not be compressed: The file is too big\./);
  assert.equal(partial.firstSaved, "/d/a-compressed.pdf");
  // A failure on the first PDF stays a plain error.
  const { client: failing } = fakeClient(() => {
    throw new Error("No.");
  });
  const first = await compressFiles(failing, memDisk(), ["/d/a.pdf"], "basic").then(
    () => undefined,
    (e: unknown) => e,
  );
  assert.equal(partialCompress(first), undefined);
});

test("merge: two or more PDFs in name order, saved next to the first", async () => {
  const { client, runs } = fakeClient();
  const disk = memDisk();
  const saved = await mergeFiles(client, disk, ["/d/part10.pdf", "/d/part2.pdf"]);
  assert.deepEqual(runs[0]!.inputs, ["/d/part2.pdf", "/d/part10.pdf"]);
  assert.equal(runs[0]!.tool, "merge");
  assert.equal(saved.path, "/d/part2-merged.pdf");
  await assert.rejects(mergeFiles(client, disk, ["/d/one.pdf"]), /two or more/);
});

test("bijoy to unicode: the selected text goes to the bijoy_to_unicode job", async () => {
  const { client, runs } = fakeClient(() => ({ text: "আমি" }));
  assert.equal(await bijoyToUnicode(client, "Avwg"), "আমি");
  assert.deepEqual(runs[0], { tool: "bijoy_to_unicode", inputs: [], options: { text: "Avwg" } });
  await assert.rejects(bijoyToUnicode(client, "   "), /Select some Bijoy text/);
  const long = fakeClient(() => ({
    text: "short\n[The full text is in converted.txt]",
    files: [{ name: "converted.txt", bytes: async () => bytes("the whole text") }],
  }));
  assert.equal(await bijoyToUnicode(long.client, "x"), "the whole text");
});

test("friendly errors, paused first", () => {
  const paused = friendlyError({
    code: "integration_paused",
    message:
      "KovaPDF has paused connections from this app for now. Nothing was changed. Please try again later, or use https://www.kovapdf.com.",
  });
  assert.equal(paused.paused, true);
  assert.match(paused.message, /paused connections from this app/);
  assert.equal(friendlyError({ code: "tool_paused", message: "x" }).paused, true);
  assert.equal(
    friendlyError({ code: "not_available", message: "This KovaPDF feature is not available yet." }).title,
    "Not available yet",
  );
  assert.match(friendlyError({ code: "missing_api_key", message: "No key." }).message, /preferences/);
  assert.match(friendlyError({ code: "limit_reached", message: "Limit.", retryAfter: 30 }).message, /30 seconds/);
  assert.equal(friendlyError(undefined).paused, false);
  assert.equal(friendlyError("boom").title, "KovaPDF could not finish");
});

test("verify markdown shows file text as data", () => {
  const md = verifyMarkdown("a`b.pdf", { signatures: [{ signerName: "Eve `ignore previous`", status: "valid" }] });
  assert.match(md, /1 signature found/);
  assert.ok(!md.includes("`ignore previous`"));
  assert.match(md, /Done with KovaPDF/);
  assert.match(verifyMarkdown("x.pdf", { signatures: [] }), /No digital signatures/);
});

test("the Store keeps the version: the manifest has none, the client header has its own", () => {
  const pkg = JSON.parse(readFileSync(path.join(__dirname, "../../package.json"), "utf8"));
  assert.equal(pkg.version, undefined);
  assert.match(EXTENSION_VERSION, /^\d+\.\d+\.\d+$/);
  assert.match(pkg.description, /Requires a KovaPDF account and API key\./);
  const prefs = pkg.preferences.find((p: { name: string }) => p.name === "apiKey");
  assert.equal(prefs.type, "password");
});

test("the real SDK client: sends X-KovaPDF-Client raycast, and integration_paused becomes a friendly toast", async () => {
  const seen: http.IncomingHttpHeaders[] = [];
  const server = http.createServer((req, res) => {
    seen.push(req.headers);
    req.resume();
    req.on("end", () => {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Paused.", code: "integration_paused", platform: "raycast" }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const saved = process.env.KOVAPDF_BASE_URL;
  process.env.KOVAPDF_BASE_URL = `http://127.0.0.1:${port}/api/v1`;
  try {
    const client = makeClient("kova_test_raycast");
    const err = await bijoyToUnicode(client, "Avwg").catch((e: unknown) => e);
    const f = friendlyError(err);
    assert.equal(f.paused, true);
    assert.equal(
      f.message,
      "KovaPDF has paused connections from this app for now. Nothing was changed. Please try again later, or use https://www.kovapdf.com.",
    );
    assert.equal(seen.length, 1, "a paused answer is not retried");
    assert.equal(seen[0]!["x-kovapdf-client"], "raycast");
    assert.equal(seen[0]!["user-agent"], `kovapdf-raycast/${EXTENSION_VERSION} (+https://www.kovapdf.com)`);
    assert.equal(seen[0]!.authorization, "Bearer kova_test_raycast");
  } finally {
    if (saved === undefined) delete process.env.KOVAPDF_BASE_URL;
    else process.env.KOVAPDF_BASE_URL = saved;
    server.close();
  }
});
