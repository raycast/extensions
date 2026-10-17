import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { endpoint, createImage } from "../src/lib/images";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
test("normalizes roots and full endpoints; rejects unsafe configuration", () => {
  assert.equal(
    endpoint("https://example.com/v1/", false),
    "https://example.com/v1/images/generations",
  );
  assert.equal(
    endpoint("https://example.com/v1/images/generations", true),
    "https://example.com/v1/images/edits",
  );
  assert.throws(() => endpoint("http://example.com/v1", false), /HTTPS/);
  assert.throws(
    () => endpoint("https://secret@example.com/v1", false),
    /credentials/,
  );
});
test("generation, multipart editing, error handling and file output against a mock provider", async () => {
  const directory = await mkdtemp(join(tmpdir(), "custom-image-test-"));
  const requests: { url: string; type: string; body: string; auth: string }[] =
    [];
  let mode = "ok";
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({
      url: req.url || "",
      type: req.headers["content-type"] || "",
      body: Buffer.concat(chunks).toString(),
      auth: req.headers.authorization || "",
    });
    res.setHeader("Content-Type", "application/json");
    if (mode === "error") {
      res.statusCode = 401;
      res.end('{"error":"secret-token"}');
    } else if (mode === "empty") res.end('{"data":[]}');
    else if (mode === "bad-image")
      res.end(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("not an image").toString("base64") }],
        }),
      );
    else
      res.end(JSON.stringify({ data: [{ b64_json: png.toString("base64") }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const config = {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    apiKey: "secret-token",
    model: "custom-model",
    outputDirectory: directory,
  };
  try {
    const result = await createImage(config, {
      prompt: "a cat",
      size: "default",
    });
    assert.deepEqual(await readFile(result.path), png);
    assert.deepEqual(JSON.parse(requests[0].body), {
      model: "custom-model",
      prompt: "a cat",
      n: 1,
    });
    assert.equal(requests[0].auth, "Bearer secret-token");
    assert.equal(requests[0].url, "/v1/images/generations");
    assert.match(result.markdown, /file:\/\//);
    await createImage(config, {
      prompt: "make it blue",
      imagePath: result.path,
    });
    assert.equal(requests[1].url, "/v1/images/edits");
    assert.match(requests[1].type, /multipart\/form-data; boundary=/);
    assert.match(requests[1].body, /name="image"; filename=/);
    assert.match(requests[1].body, /image\/png/);
    assert.match(requests[1].body, /make it blue/);
    mode = "error";
    await assert.rejects(
      createImage(config, { prompt: "cat" }),
      (error) =>
        error instanceof Error &&
        error.message.includes("401") &&
        !error.message.includes("secret-token"),
    );
    mode = "empty";
    await assert.rejects(createImage(config, { prompt: "cat" }), /no data/);
    mode = "bad-image";
    await assert.rejects(
      createImage(config, { prompt: "cat" }),
      /unsupported content/,
    );
    const invalid = join(directory, "not-image.txt");
    await writeFile(invalid, "hello");
    const count = requests.length;
    await assert.rejects(
      createImage(config, { prompt: "edit", imagePath: invalid }),
      /unsupported content/,
    );
    await assert.rejects(createImage(config, { prompt: "  " }), /prompt/);
    assert.equal(requests.length, count);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
