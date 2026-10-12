import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test, type TestContext } from "node:test";
import {
  conversionArgs,
  convertFiles,
  getTargets,
  parseEvent,
  parseFormats,
  resolveBinary,
  validateFiles,
  validateOptions,
} from "../src/lib/convt";

// A real subprocess fixture exercises argv, streaming, exit codes, and cancellation.
// Format/event shapes match convt-cli's public protocol (Convt 0.4.0).
const fixtureSource = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const record = (entry) => fs.appendFileSync(path.join(path.dirname(process.argv[1]), "queries.log"), entry + "\\n");
const formats = [
  {id: "jpeg", name: "JPEG", category: "image", extensions: ["jpg", "jpeg"]},
  {id: "png", name: "PNG", category: "image", extensions: ["png"]},
  {id: "webp", name: "WebP", category: "image", extensions: ["webp"]},
];
const emit = value => process.stdout.write(JSON.stringify(value) + "\\n");
if (args[0] === "formats") { record("formats"); emit(formats); process.exit(0); }
if (args[0] === "targets") {
  record("targets " + path.basename(args[1]));
  if (path.basename(args[1]).startsWith("stall")) {
    setInterval(() => {}, 1000);
    return;
  }
  if (args[1].endsWith(".pdf")) console.log("png\\njpeg");
  else if (args[1].endsWith(".png")) console.log("jpeg\\nwebp");
  else { console.error("unknown format"); process.exit(1); }
  process.exit(0);
}
const files = args.slice(args.indexOf("--") + 1);
const target = args[args.indexOf("--to") + 1];
const outDir = args.includes("--out-dir") ? args[args.indexOf("--out-dir") + 1] : undefined;
fs.writeFileSync(path.join(path.dirname(files[0]), "argv.json"), JSON.stringify(args));
let failed = false;
for (const [index, input] of files.entries()) {
  if (path.basename(input).startsWith("blocked")) { console.error("Your convt trial has ended."); process.exit(1); }
  if (path.basename(input).startsWith("malformed")) { console.log("not json"); process.exit(0); }
  emit({event: "started", index, input});
  if (path.basename(input).startsWith("hold")) {
    process.on("SIGINT", () => {
      emit({event: "failed", index, input, kind: "cancelled", message: "cancelled"});
      process.exit(130);
    });
    setInterval(() => emit({event: "progress", index, fraction: 0.5}), 20);
    return;
  }
  if (path.basename(input).startsWith("fail")) {
    emit({event: "failed", index, input, kind: "engine", message: "Invalid image data"});
    failed = true;
    continue;
  }
  const count = input.endsWith(".pdf") ? 3 : 1;
  const outputs = Array.from({length: count}, (_, page) => path.join(outDir || path.dirname(input), path.basename(input) + "-" + page + "." + target));
  for (const output of outputs) fs.writeFileSync(output, "converted");
  const line = JSON.stringify({event: "done", index, input, outputs}) + "\\n";
  const bytes = Buffer.from(line);
  // Split in the middle of a multibyte filename as well as in the middle of JSON.
  const split = bytes.indexOf(Buffer.from("é")) + 1;
  process.stdout.write(bytes.subarray(0, split));
  process.stdout.write(bytes.subarray(split));
}
emit({event: "summary", done: files.length - Number(failed), failed: Number(failed), cancelled: 0});
process.exitCode = failed ? 1 : 0;
`;

async function fixture(t: TestContext, names: string[]) {
  const directory = await mkdtemp(path.join(tmpdir(), "convt test "));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const binary = path.join(directory, "convt fixture");
  await writeFile(binary, fixtureSource, { mode: 0o755 });
  const files = names.map((name) => path.join(directory, name));
  for (const file of files) await writeFile(file, "input");
  return { directory, binary, files };
}

test("validates external format and event payloads", () => {
  assert.equal(parseFormats('[{"id":"jpeg","name":"JPEG","category":"image","extensions":["jpg"]}]')[0].id, "jpeg");
  assert.throws(() => parseFormats("{}"));
  assert.throws(() => parseFormats('[{"id":"jpeg","name":"JPEG","category":"image","extensions":[2]}]'));
  assert.throws(() => parseEvent('{"event":"done","index":0,"outputs":["relative.png"]}'));
  assert.throws(() => parseEvent('{"event":"progress","index":0,"fraction":2}'));
  assert.throws(() => parseEvent('{"event":"started","index":-1}'));
  assert.equal(parseEvent('{"event":"summary","done":1}'), null);
});

test("rejects invalid options before invoking Convt", () => {
  for (const quality of [0, 101, 2.5, NaN]) assert.throws(() => validateOptions({ quality }));
  for (const dpi of [17, 1201, Infinity]) assert.throws(() => validateOptions({ dpi }));
  for (const maxSize of [0, -1, 4_294_967_296]) assert.throws(() => validateOptions({ maxSize }));
  for (const pages of ["0", "3-1", "1,3", "-2", "1-0", "4294967296"]) assert.throws(() => validateOptions({ pages }));
  for (const pages of ["2", "1-3", "4-"]) validateOptions({ pages, quality: 100, dpi: 1200, maxSize: 1 });
});

test("passes literal arguments and separates filenames from flags", () => {
  const files = ["/tmp/-photo $(touch nope); 'é.png"];
  const args = conversionArgs({ files, target: "jpeg", quality: 85, pages: "1-3", outputDirectory: "/tmp/my output" });
  assert.deepEqual(args, [
    "--json",
    "--jobs",
    "1",
    "--to",
    "jpeg",
    "--out-dir",
    "/tmp/my output",
    "--quality",
    "85",
    "--pages",
    "1-3",
    "--",
    ...files,
  ]);
  assert.throws(() => conversionArgs({ files, target: "--help" }));
});

test("resolves explicit executables and does not silently fall back from a bad preference", async (t) => {
  const { binary, directory } = await fixture(t, []);
  assert.equal(await resolveBinary(binary), binary);
  await assert.rejects(resolveBinary(path.join(directory, "missing")), /No executable found/);
  await assert.rejects(resolveBinary("convt"), /absolute path/);
  await assert.rejects(resolveBinary(directory), /No executable found/);
});

test("rejects missing files and folders and deduplicates paths", async (t) => {
  const { directory, files } = await fixture(t, ["one.png"]);
  await assert.rejects(validateFiles([]), /at least one/);
  await assert.rejects(validateFiles([directory]), /not a file/);
  await assert.rejects(validateFiles([path.join(directory, "missing.png")]), /Cannot read/);
  await assert.rejects(validateFiles(["relative.png"]), /absolute paths/);
  assert.deepEqual(await validateFiles([...files, ...files]), files);
});

test("intersects available targets across all source formats", async (t) => {
  const { binary, files } = await fixture(t, ["image.png", "report.pdf"]);
  assert.deepEqual(
    (await getTargets(binary, files)).map((format) => format.id),
    ["jpeg"],
  );
  await assert.rejects(convertFiles(binary, { files, target: "webp" }), /cannot all convert/);
});

test("rejects invalid output folders with friendly validation before conversion", async (t) => {
  const { binary, files, directory } = await fixture(t, ["one.png"]);
  for (const outputDirectory of [
    "relative",
    files[0],
    path.join(directory, "missing"),
    path.join(files[0], "nested"),
  ]) {
    await assert.rejects(convertFiles(binary, { files, target: "jpeg", outputDirectory }), {
      message: "Choose an existing output folder.",
    });
  }
  await assert.rejects(readFile(path.join(directory, "argv.json")), { code: "ENOENT" });
});

test("keeps actual multi-page output paths and successful files when another file fails", async (t) => {
  const { binary, files, directory } = await fixture(t, ["café $(echo nope).png", "fail.png", "report.pdf"]);
  const results = await convertFiles(binary, { files, target: "jpeg", outputDirectory: directory });
  assert.equal(results.length, 3);
  assert.equal(results[0].status, "done");
  assert.equal(results[1].status, "failed");
  assert.equal(results[2].status, "done");
  if (results[0].status !== "done" || results[2].status !== "done") throw new Error("Expected successful outputs");
  assert.equal(results[0].outputs[0], `${files[0]}-0.jpeg`);
  assert.equal(results[2].outputs.length, 3);
  assert.equal(await readFile(results[0].outputs[0], "utf8"), "converted");
  assert.deepEqual(structuredClone(results), results);
  const args = JSON.parse(await readFile(path.join(directory, "argv.json"), "utf8"));
  assert.deepEqual(args.slice(args.indexOf("--") + 1), files);
});

test("surfaces licensing errors instead of claiming success or losing the message", async (t) => {
  const { binary, files } = await fixture(t, ["blocked.png"]);
  const [result] = await convertFiles(binary, { files, target: "jpeg" });
  assert.equal(result.status, "failed");
  if (result.status !== "done") assert.match(result.message, /trial has ended/);
});

test("does not invent outputs when a process exits successfully with malformed output", async (t) => {
  const { binary, files } = await fixture(t, ["malformed.png"]);
  const [result] = await convertFiles(binary, { files, target: "jpeg" });
  assert.equal(result.status, "failed");
});

test("a pre-cancelled request does not start conversion", async (t) => {
  const { binary, files, directory } = await fixture(t, ["one.png"]);
  const results = await convertFiles(binary, { files, target: "jpeg" }, { signal: AbortSignal.abort() });
  assert.equal(results[0].status, "cancelled");
  await assert.rejects(readFile(path.join(directory, "argv.json")));
  await assert.rejects(readFile(path.join(directory, "queries.log")));
});

test("aborts target checks and does not start later ones", { timeout: 10_000 }, async (t) => {
  const { binary, files, directory } = await fixture(t, ["stall.png", "report.pdf"]);
  const controller = new AbortController();
  const pending = convertFiles(binary, { files, target: "jpeg" }, { signal: controller.signal });
  const logPath = path.join(directory, "queries.log");
  const started = Date.now();
  let log = "";
  while (Date.now() - started < 5_000) {
    log = await readFile(logPath, "utf8").catch(() => "");
    if (log.includes("targets stall.png")) break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  controller.abort();
  const results = await pending;
  assert.deepEqual(
    results.map((result) => result.status),
    ["cancelled", "cancelled"],
  );
  log = await readFile(logPath, "utf8");
  assert.match(log, /targets stall\.png/);
  assert.doesNotMatch(log, /report\.pdf/);
});

test("cancels an active process while retaining completed outputs", { timeout: 10_000 }, async (t) => {
  const { binary, files } = await fixture(t, ["one.png", "hold.png", "later.png"]);
  const controller = new AbortController();
  const results = await convertFiles(
    binary,
    { files, target: "jpeg" },
    {
      signal: controller.signal,
      onProgress: ({ fraction }) => {
        if (fraction === 0.5) controller.abort();
      },
    },
  );
  assert.deepEqual(
    results.map((result) => result.status),
    ["done", "cancelled", "cancelled"],
  );
});
