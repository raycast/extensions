import { strict as assert } from "node:assert";
import {
  mkdtemp,
  mkdir,
  symlink,
  writeFile,
  readFile,
  rename,
  rm,
  copyFile,
  realpath,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createService } from "../service/server";
import { paths } from "../service/paths";
import { LocalClient } from "../service/client";
import { DEFAULT_CONFIG } from "../service/protocol";

// Real model + native engine + Unix service, isolated from personal folders and the installed index.
const WAIT_MS = 120000;
const POLL_MS = 250;
const exec = promisify(execFile);

// A tiny PDF exercises PDFKit without external document libraries.
function samplePDF(): string {
  const text =
    "BT /F1 18 Tf 60 700 Td (Vaccination record for Atlas the dog. Rabies booster administered in September.) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = output.length;
  output += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return output;
}
async function wait(
  check: () => Promise<boolean>,
  label: string,
): Promise<void> {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    if (await check()) {
      return;
    }
    await new Promise((done) => {
      setTimeout(done, POLL_MS);
    });
  }
  throw new Error(`Timed out: ${label}`);
}

async function main(): Promise<void> {
  // Read Low Power Mode from Foundation rather than guessing pmset's changing setting names.
  const resource = await exec(
    resolve(__dirname, "../native/.build/release/local-search-engine"),
    ["resources"],
    { timeout: 10000 },
  );
  assert.equal(typeof JSON.parse(resource.stdout).lowPowerMode, "boolean");

  const root = await mkdtemp(join(tmpdir(), "ls-e2e-"));
  const locations = paths(join(root, "state"));
  const content = join(root, "content");
  await mkdir(content);
  await mkdir(join(locations.base, "bin"), { recursive: true });
  await symlink(paths().models, locations.models);
  await symlink(
    resolve(__dirname, "../native/.build/release/local-search-engine"),
    locations.engine,
  );
  await writeFile(
    join(content, "lease.txt"),
    "The rental agreement permits two cats and one dog. A pet deposit is required before moving into the apartment.",
  );
  await writeFile(
    join(content, "recipe.txt"),
    "To bake sourdough bread, mix flour, water, salt, and a fermented starter. Let the dough rise overnight.",
  );
  await writeFile(
    join(content, "travel.txt"),
    "The flight to Tokyo departs Friday. Take the express train from Haneda airport to the hotel.",
  );
  await writeFile(
    join(content, "secret.txt"),
    "Credential material must never be indexed.",
  );
  const service = await createService(locations);
  const client = new LocalClient(service.socket);
  try {
    await client.configure({ ...DEFAULT_CONFIG, roots: [content] });
    await wait(async () => {
      const status = await client.status();
      return status.counts?.searchable === 3 && status.activity === "idle";
    }, "initial background index");
    const start = performance.now();
    const hits = await client.search("restrictions on domestic animals");
    const latencyMs = Math.round(performance.now() - start);
    assert.equal(hits[0]?.path.split("/").pop(), "lease.txt");
    // A content query containing code: must remain literal text, never switch to the unused source-code index.
    assert.ok(
      (await client.search("code: rental agreement")).some((hit) =>
        hit.path.endsWith("lease.txt"),
      ),
    );
    assert.ok(Array.isArray(await client.search("code:")));
    await assert.rejects(access(join(locations.index, "code.sqlite")), {
      code: "ENOENT",
    });
    assert.ok(!hits.some((hit) => hit.path.endsWith("secret.txt")));
    console.log(
      `PASS semantic retrieval (${latencyMs} ms, real EmbeddingGemma 2)`,
    );
    assert.ok(
      Array.isArray(await client.search("--reindex")),
      "Option-like queries remain data",
    );

    // No Raycast process is involved: a filesystem watcher alone must index new content.
    await client.configure({ ...(await client.status()).config, paused: true });
    await writeFile(
      join(content, "space.txt"),
      "The Europa probe carries an ice drill to search for life beneath Jupiter's frozen moon.",
    );
    await new Promise((done) => {
      setTimeout(done, 2500);
    });
    assert.equal((await client.status()).counts?.searchable, 3);
    assert.equal((await client.status()).activity, "paused");
    await client.configure({
      ...(await client.status()).config,
      paused: false,
    });
    await wait(async () => {
      const status = await client.status();
      return status.counts?.searchable === 4 && status.activity === "idle";
    }, "resume and incremental indexing");
    assert.equal(
      (await client.search("spacecraft drilling into an icy moon"))[0]?.path
        .split("/")
        .pop(),
      "space.txt",
    );
    console.log("PASS pause/resume and indexing with Raycast closed");

    await writeFile(
      join(content, "lease.txt"),
      "The apartment prohibits all pets. Cats and dogs may not live in the rental unit.",
    );
    await wait(async () => {
      const status = await client.status();
      return status.activity === "indexing";
    }, "watcher notices changed file");
    await wait(async () => {
      const status = await client.status();
      return status.counts?.pending === 0 && status.activity === "idle";
    }, "changed file indexed");
    const changed = await client.search("apartment pet rules");
    assert.ok(
      changed.some((hit) =>
        hit.excerpt?.replace(/[«»]/g, "").includes("prohibits all pets"),
      ),
    );
    console.log("PASS updated file contents");

    // A disappeared root must retain records; a deleted file in an available root must not.
    await rename(content, `${content}-offline`);
    await client.rescan();
    await wait(async () => {
      const status = await client.status();
      return status.missingRoots.length === 1 && status.activity === "idle";
    }, "unavailable root retained");
    // Active-root statistics become zero while disconnected; verify the underlying index still has its vectors.
    const retained = await exec(
      locations.engine,
      ["status", "--index", locations.index],
      { timeout: 10000 },
    );
    assert.match(retained.stdout, /vectors:\s+4\b/);
    await rename(`${content}-offline`, content);
    await rm(join(content, "travel.txt"));
    await client.rescan();
    await wait(async () => {
      const status = await client.status();
      return status.counts?.searchable === 3 && status.activity === "idle";
    }, "deleted file removed");
    console.log("PASS disconnected root preservation and file deletion");

    // Index an image and audio fixture from the inherited vector-regression suite.
    const reference = resolve(
      __dirname,
      "../native/Tests/LlamaRuntimeTests/Reference",
    );
    await copyFile(
      join(reference, "screen.png"),
      join(content, "Screenshot-test.png"),
    );
    await copyFile(
      join(reference, "photo.jpg"),
      join(content, "landscape.jpg"),
    );
    await writeFile(join(content, "records.pdf"), samplePDF());
    await exec(
      "/usr/bin/say",
      [
        "-o",
        join(root, "speech.aiff"),
        "On Thursday the finance committee approved a revised budget for the community library.",
      ],
      { timeout: 30000 },
    );
    const ffmpeg = "/opt/homebrew/bin/ffmpeg";
    await exec(
      ffmpeg,
      [
        "-nostdin",
        "-loglevel",
        "error",
        "-i",
        join(root, "speech.aiff"),
        "-ar",
        "16000",
        "-ac",
        "1",
        "-threads",
        "1",
        join(content, "recording.wav"),
      ],
      { timeout: 30000 },
    );
    await exec(
      ffmpeg,
      [
        "-nostdin",
        "-loglevel",
        "error",
        "-loop",
        "1",
        "-i",
        join(reference, "photo.jpg"),
        "-t",
        "2",
        "-vf",
        "scale=320:-2",
        "-r",
        "1",
        "-c:v",
        "libx264",
        "-threads",
        "1",
        "-pix_fmt",
        "yuv420p",
        join(content, "scene.mp4"),
      ],
      { timeout: 30000 },
    );
    await client.rescan();
    await wait(async () => {
      const status = await client.status();
      return status.counts?.searchable === 8 && status.activity === "idle";
    }, "all-modality background indexing");
    const visual = await client.search(
      "green hills under a blue sky with the sun",
    );
    assert.ok(
      visual.slice(0, 2).some((hit) => hit.path.endsWith("landscape.jpg")),
    );
    assert.ok(
      visual
        .slice(0, 2)
        .some((hit) => hit.path.endsWith("scene.mp4") && hit.loc !== undefined),
    );
    const spoken = await client.search(
      "meeting about funding the public reading room",
    );
    assert.equal(spoken[0]?.path.split("/").pop(), "recording.wav");
    assert.ok(spoken[0].loc !== undefined);
    const pdf = await client.search("dog vaccination record");
    assert.equal(pdf[0]?.path.split("/").pop(), "records.pdf");
    assert.equal(pdf[0].loc, 1);
    console.log("PASS PDF, image, spoken-audio, and video content retrieval");
    // Exercise service -> native scope arguments and UTF-8 paths while stale out-of-scope rows remain indexed.
    const selected = join(content, "résumé-日本-🐈");
    await mkdir(selected);
    await writeFile(
      join(selected, "selected.txt"),
      "uniquereviewmarker The rental agreement permits cats and dogs in the apartment.",
    );
    await client.rescan();
    await wait(async () => {
      const status = await client.status();
      return status.counts?.searchable === 9 && status.activity === "idle";
    }, "Unicode descendant indexed");
    await client.configure({
      ...(await client.status()).config,
      roots: [selected],
      excludedFolders: [content],
      paused: true,
    });
    const selectedFile = join(await realpath(selected), "selected.txt");
    assert.deepEqual(
      (await client.search("uniquereviewmarker")).map((hit) => hit.path),
      [selectedFile],
    );
    assert.equal(
      (await client.search("restrictions on domestic animals"))[0]?.path,
      selectedFile,
    );
    await client.configure({
      ...(await client.status()).config,
      excludedExtensions: ["txt"],
    });
    assert.deepEqual(await client.search("uniquereviewmarker"), []);
    console.log(
      "PASS native scope, ancestor exclusions, extension exclusions, and Unicode paths",
    );
    const result = {
      timestamp: new Date().toISOString(),
      semanticLatencyMs: latencyMs,
      finalStatus: await client.status(),
      checks: [
        "semantic retrieval",
        "flag safety",
        "literal code-prefix content queries",
        "secret exclusions",
        "pause/resume",
        "watcher updates",
        "disconnected roots",
        "deletions",
        "PDF/image/spoken-audio/video retrieval",
        "native pre-ranking scope and selected descendants",
        "Unicode file paths",
        "native extension exclusions",
      ],
    };
    assert.ok(
      (await readFile(join(locations.index, "index.sqlite"))).length > 0,
    );
    // Removing the final folder must discard extracted contents, even when indexing is paused.
    await client.configure({
      ...(await client.status()).config,
      roots: [],
      paused: true,
    });
    const cleared = await exec(
      locations.engine,
      ["status", "--index", locations.index],
      { timeout: 10000 },
    );
    assert.match(cleared.stdout, /vectors:\s+0\b/);
    console.log("PASS clearing the final selected folder");
    result.checks.push("clearing final folder while paused");
    await writeFile(
      resolve(__dirname, "../docs/e2e-results.json"),
      JSON.stringify(result, null, 2),
    );
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
