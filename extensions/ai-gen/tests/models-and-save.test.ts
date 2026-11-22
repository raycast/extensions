import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseModels, discoverModels, MAX_MODEL_LIST_BYTES } from "../src/lib/compatible-images/models";
import { saveCopy } from "../src/lib/compatible-images/save-copy";

test("model candidates distinguish declared image output, name guesses, and other models", () => {
  const result = parseModels({
    data: [
      { id: "gpt-image-1" },
      { id: "gpt-image-1" },
      { id: "my-art", architecture: { output_modalities: ["image", "text"] } },
      {
        id: "vision-reader",
        architecture: {
          input_modalities: ["image"],
          output_modalities: ["text"],
        },
      },
      { id: "gpt-image-text-only", output_modalities: ["text"] },
      null,
      { id: 42 },
      { id: "" },
    ],
  });
  assert.equal(result.length, 4);
  assert.equal(result.find((m) => m.id === "my-art")?.source, "declared");
  assert.equal(result.find((m) => m.id === "gpt-image-1")?.source, "inferred");
  assert.equal(result.find((m) => m.id === "vision-reader")?.source, "unknown");
  assert.equal(result.find((m) => m.id === "gpt-image-text-only")?.source, "unknown");
  assert.throws(() => parseModels({ models: [] }), /model list/);
  assert.deepEqual(parseModels({ data: [] }), []);
});

test("discovery uses authenticated GET models and reports failures without generating images", async () => {
  const requests: string[] = [];
  let status = 200;
  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    assert.equal(req.headers.authorization, "Bearer test-key");
    res.statusCode = status;
    res.end(JSON.stringify({ data: [{ id: "gpt-image-1" }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const base = `http://127.0.0.1:${address.port}/v1/images/edits`;
    assert.equal((await discoverModels(base, "test-key"))[0].id, "gpt-image-1");
    status = 401;
    await assert.rejects(discoverModels(base, "test-key"), /HTTP 401/);
    assert.deepEqual(requests, ["GET /v1/models", "GET /v1/models"]);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("Save As preserves the original and refuses overwrites, traversal and fake conversion", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atelier-save-"));
  const source = join(directory, "source.png");
  try {
    await writeFile(source, "image-bytes");
    const copy = await saveCopy(source, directory, "copy.png");
    assert.equal(await readFile(copy, "utf8"), "image-bytes");
    assert.equal(await readFile(source, "utf8"), "image-bytes");
    await assert.rejects(saveCopy(source, directory, "copy.png"), /already exists/);
    await assert.rejects(saveCopy(source, directory, "../escape.png"), /filename/);
    await assert.rejects(saveCopy(source, directory, "copy.jpg"), /does not convert/);
    await assert.rejects(saveCopy(source, "", "copy.png"), /destination/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("model discovery rejects oversized declared and chunked responses", async () => {
  for (const declared of [true, false]) {
    const server = createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      if (declared) res.setHeader("Content-Length", MAX_MODEL_LIST_BYTES + 1);
      res.write('{"data":[],"padding":"');
      res.end("x".repeat(MAX_MODEL_LIST_BYTES));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    try {
      await assert.rejects(discoverModels(`http://127.0.0.1:${address.port}/v1`, "test-key"), /size limit/);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
});

test("model discovery still reports invalid JSON distinctly", async () => {
  const server = createServer((_req, res) => res.end("not-json"));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await assert.rejects(discoverModels(`http://127.0.0.1:${address.port}/v1`, "test-key"), /non-JSON/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
