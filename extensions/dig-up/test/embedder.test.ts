// The llama-server embedder: DigUp's ReferenceVectorTests (cosine >= 0.999 on its nine inputs), DigUp's text cut, one bad
// file per slot, and the servers' lifecycle. The server suites need the vendored llama.cpp (.vendor/llama-b11624) and
// the model files in DigUp's folder, and skip without them; the image cases also need the Swift helper (assets/digup-helper).

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { EmbedderManager, cutWav, serverArgs, unitVector, type Embedder } from "../engine/embedder";
import { silentLog } from "../engine/log";
import { DIMENSION, Prompts } from "../engine/types";
import {
  AGREEMENT,
  REFERENCE_DIR,
  REFERENCE_IMAGES,
  cosine,
  helperMissing,
  makeManager,
  referenceSetup,
  referenceTexts,
  sizeImages,
  storedVectors,
} from "../scripts/reference-vectors";

const setup = referenceSetup();
const serverSkip = "skip" in setup ? `llama-server check skipped: ${setup.skip}` : false;
/** The llama.cpp and model files to run; only read inside the suites that skip without them. */
const server = "skip" in setup ? null : setup;
const imageSkip = helperMissing() ? `image cases skipped: ${helperMissing()}` : false;

const scratches: string[] = [];
function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), "digup-embedder-"));
  scratches.push(dir);
  return dir;
}
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(what: string, done: () => boolean, ms = 10_000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!done()) {
    if (Date.now() > deadline) assert.fail(`timed out waiting for ${what}`);
    await sleep(50);
  }
}
const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** A 16 kHz mono PCM16 WAV of `seconds`, with an optional chunk before the data, as AVFoundation writes them. */
function wav(seconds: number, o: { extraChunk?: boolean; streamed?: boolean } = {}): Buffer {
  const data = Buffer.alloc(Math.round(seconds * 16_000) * 2);
  for (let i = 0; i < data.length / 2; i++) data.writeInt16LE(Math.round(Math.sin(i / 10) * 8000), i * 2);
  const fmt = Buffer.alloc(24);
  fmt.write("fmt ", 0, "latin1");
  fmt.writeUInt32LE(16, 4);
  fmt.writeUInt16LE(1, 8); // PCM
  fmt.writeUInt16LE(1, 10); // mono
  fmt.writeUInt32LE(16_000, 12);
  fmt.writeUInt32LE(32_000, 16); // byte rate
  fmt.writeUInt16LE(2, 20); // block align
  fmt.writeUInt16LE(16, 22);
  // An odd-sized chunk is padded to an even length.
  const extra = o.extraChunk
    ? Buffer.concat([Buffer.from("LIST", "latin1"), Buffer.from([3, 0, 0, 0]), Buffer.from("abc\0")])
    : Buffer.alloc(0);
  const dataHeader = Buffer.alloc(8);
  dataHeader.write("data", 0, "latin1");
  dataHeader.writeUInt32LE(o.streamed ? 0xffffffff : data.length, 4);
  const body = Buffer.concat([Buffer.from("WAVE", "latin1"), fmt, extra, dataHeader, data]);
  const riff = Buffer.alloc(8);
  riff.write("RIFF", 0, "latin1");
  riff.writeUInt32LE(body.length, 4);
  return Buffer.concat([riff, body]);
}

/** The data chunk's declared size and the bytes after its header. */
function dataOf(file: Buffer): { declared: number; bytes: number } {
  const at = file.indexOf("data", 12, "latin1");
  return { declared: file.readUInt32LE(at + 4), bytes: file.length - at - 8 };
}

describe("cutWav", () => {
  it("keeps the first 30 s of a longer recording and fixes both sizes", () => {
    const cut = cutWav(wav(40), 30);
    assert.deepEqual(dataOf(cut), { declared: 960_000, bytes: 960_000 });
    assert.equal(cut.readUInt32LE(4), cut.length - 8);
    assert.ok(cut.subarray(0, 44).subarray(8, 36).equals(wav(40).subarray(8, 36)), "format untouched");
    assert.ok(cut.subarray(44).equals(wav(40).subarray(44, 44 + 960_000)));
  });

  it("leaves a recording of 30 s or less alone", () => {
    const short = wav(29.5);
    assert.equal(cutWav(short, 30), short);
    const exact = wav(30);
    assert.equal(cutWav(exact, 30), exact);
  });

  it("finds the data after other chunks, and in a streamed file whose size is unset", () => {
    assert.equal(dataOf(cutWav(wav(31, { extraChunk: true }), 30)).bytes, 960_000);
    const streamed = cutWav(wav(31, { streamed: true }), 30);
    assert.deepEqual(dataOf(streamed), { declared: 960_000, bytes: 960_000 });
  });

  it("passes anything that is not a WAV through", () => {
    const mp3 = Buffer.from("ID3\u0004\u0000 not a wav at all", "latin1");
    assert.equal(cutWav(mp3, 30), mp3);
    assert.equal(cutWav(Buffer.alloc(4), 30).length, 4);
  });
});

describe("unitVector", () => {
  it("scales to unit length in float64, as DigUp does", () => {
    const raw = new Array(DIMENSION).fill(0);
    raw[0] = 3;
    raw[1] = 4;
    const vector = unitVector(raw);
    assert.ok(vector instanceof Float32Array);
    assert.equal(vector.length, DIMENSION);
    assert.equal(vector[0], Math.fround(0.6));
    assert.equal(vector[1], Math.fround(0.8));
  });

  it("keeps a zero vector at zero", () => {
    assert.ok(unitVector(new Array(DIMENSION).fill(0)).every((value) => value === 0));
  });

  it("refuses a vector of the wrong size or with NaN", () => {
    assert.throws(() => unitVector([1, 2, 3]), /768/);
    assert.throws(() => unitVector("nope"), /768/);
    const bad = new Array(DIMENSION).fill(0.1);
    bad[5] = Number.NaN;
    assert.throws(() => unitVector(bad), /NaN/);
  });
});

describe("serverArgs", () => {
  const files = { textModel: "/m/text.gguf", mediaModel: "/m/media.gguf" };
  const flag = (args: string[], name: string) => args[args.indexOf(name) + 1];

  it("starts the query server on the text model alone, cut at 512 tokens", () => {
    const args = serverArgs({ name: "query", media: false, batch: 512, slots: 1 }, files, 18_901);
    assert.equal(flag(args, "-m"), "/m/text.gguf");
    assert.ok(!args.includes("--mmproj"));
    assert.ok(args.includes("--embeddings") && args.includes("--no-webui"));
    assert.equal(flag(args, "--pooling"), "mean");
    assert.equal(flag(args, "--host"), "127.0.0.1");
    assert.equal(flag(args, "--port"), "18901");
    assert.deepEqual(
      [flag(args, "-c"), flag(args, "-b"), flag(args, "-ub"), flag(args, "-np")],
      ["512", "512", "512", "1"],
    );
  });

  it("gives the index server the media model, unscaled images and its batch per slot", () => {
    const args = serverArgs({ name: "index", media: true, batch: 2304, slots: 4 }, files, 18_902);
    assert.equal(flag(args, "--mmproj"), "/m/media.gguf");
    assert.equal(flag(args, "--image-min-tokens"), "1");
    assert.equal(flag(args, "--image-max-tokens"), "1120");
    assert.deepEqual(
      [flag(args, "-c"), flag(args, "-b"), flag(args, "-ub"), flag(args, "-np")],
      ["9216", "2304", "2304", "4"],
    );
  });
});

describe("EmbedderManager", () => {
  it("refuses a slot count that is not a power of two (llama.cpp issue 18532 aborts the server)", () => {
    const make = (indexParallel: number) =>
      new EmbedderManager({
        serverBin: "/x",
        textModel: "/t",
        mediaModel: "/m",
        logs: "/l",
        log: silentLog,
        indexParallel,
      });
    assert.throws(() => make(3), /power of two/);
    assert.throws(() => make(0), /power of two/);
    for (const slots of [1, 2, 4, 16]) assert.equal(make(slots).state(), "off");
  });
});

// ---------------------------------------------------------------------------------------------------------------------

describe("llama-server embedder", { skip: serverSkip }, () => {
  let manager: EmbedderManager;
  let embedder: Embedder;
  let dir: string;
  const stored = serverSkip ? {} : storedVectors();

  before(async () => {
    if (!server) return;
    dir = scratch();
    manager = makeManager(server, join(dir, "logs"));
    embedder = await manager.index();
  });
  after(async () => {
    await manager?.stop();
  });

  const port = () => manager.servers().index.port!;
  async function post(path: string, body: unknown): Promise<{ status: number; json: any }> {
    const response = await fetch(`http://127.0.0.1:${port()}${path}`, { method: "POST", body: JSON.stringify(body) });
    return { status: response.status, json: await response.json() };
  }
  const tokenize = async (content: string) =>
    (await post("/tokenize", { content, add_special: true, parse_special: true })).json.tokens as number[];

  describe("DigUp's reference vectors (ReferenceVectorTests, cosine >= 0.999)", () => {
    it("texts", async () => {
      const texts = referenceTexts();
      const vectors = await embedder.embedTexts(texts.map((t) => t.text));
      for (const [i, { name }] of texts.entries()) {
        const value = cosine(vectors[i], stored[name]);
        assert.ok(value >= AGREEMENT, `${name}: cosine ${value.toFixed(6)}`);
      }
    });

    it("speech", async () => {
      const [vector] = await embedder.embedAudio([join(REFERENCE_DIR, "speech.wav")]);
      assert.ok(!(vector instanceof Error), String(vector));
      const value = cosine(vector, stored.speech);
      assert.ok(value >= AGREEMENT, `speech: cosine ${value.toFixed(6)}`);
    });

    for (const image of REFERENCE_IMAGES) {
      it(
        `${image.name} (${image.file} sized by the helper for ${image.budget} tokens)`,
        { skip: imageSkip },
        async () => {
          const out = join(dir, `${image.name}.png`);
          await sizeImages([{ path: join(REFERENCE_DIR, image.file), budget: image.budget, out }]);
          const [vector] = await embedder.embedImages([out]);
          assert.ok(!(vector instanceof Error), String(vector));
          const value = cosine(vector, stored[image.name]);
          assert.ok(value >= AGREEMENT, `${image.name}: cosine ${value.toFixed(6)}`);
        },
      );
    }
  });

  describe("long texts", () => {
    const long = referenceTexts()[4].text.repeat(4); // about 8,150 tokens

    it("are refused whole by the server, so the client has to cut them", async () => {
      const answer = await post("/v1/embeddings", { input: [long], encoding_format: "float" });
      assert.equal(answer.status, 500);
      assert.match(answer.json.error.message, /too large to process/);
    });

    for (const [role, limit] of [
      ["index", 2048],
      ["query", 512],
    ] as const) {
      it(`are cut DigUp's way for the ${role} encoder: <bos>, the first ${limit - 2} tokens, <eos>`, async () => {
        const handle = role === "index" ? embedder : await manager.query();
        const tokens = await tokenize(long);
        assert.ok(tokens.length > limit);
        // The same input as a string: the text those tokens spell, which the tokenizer reads back to the same ids.
        const prefix = (await post("/detokenize", { tokens: tokens.slice(1, limit - 1) })).json.content as string;
        assert.deepEqual(await tokenize(prefix), [...tokens.slice(0, limit - 1), tokens.at(-1)]);
        const [cut] = await handle.embedTexts([long]);
        const expected = (await post("/v1/embeddings", { input: [prefix], encoding_format: "float" })).json;
        assert.equal(expected.usage.prompt_tokens, limit);
        assert.ok(cosine(cut, expected.data[0].embedding) > 0.99999);
        if (role === "query") {
          // On the query server's own 512-token profile, not on the index server beside it.
          const { query, index } = manager.servers();
          assert.ok(query.state === "ready" && query.pid !== index.pid);
          const command = readFileSync(join(dir, "logs", "llama-query.log"), "utf8").split("\n")[0];
          assert.match(command, / -c 512 -b 512 -ub 512 -np 1 /);
          assert.ok(!command.includes("--mmproj"));
        }
      });
    }

    it("are read as Swift reads a lone surrogate (U+FFFD), without failing the batch around them", async () => {
      const vectors = await embedder.embedTexts(["fine one", "bad \ud83d", "fine two"]);
      assert.equal(vectors.length, 3);
      const [replaced] = await embedder.embedTexts(["bad \uFFFD"]);
      assert.ok(cosine(vectors[1], replaced) > 0.99999);
      // Over the byte bound, the text goes to /tokenize first, which refuses one the same way.
      const query = await manager.query();
      const wordy = `${"word ".repeat(200)}\udc00 end`;
      const [a] = await query.embedTexts([wordy]);
      const [b] = await query.embedTexts([wordy.replace("\udc00", "\uFFFD")]);
      assert.ok(cosine(a, b) > 0.99999);
    });

    it("keep their order in batches of more than 16, mixed with short ones", async () => {
      const texts = Array.from({ length: 20 }, (_, i) =>
        i % 5 === 2 ? `${i} ${long}` : Prompts.document(`note ${i}`, `Item ${i}: the meeting moved to room ${i}.`),
      );
      const together = await embedder.embedTexts(texts);
      assert.equal(together.length, 20);
      for (const [i, text] of texts.entries()) {
        const [alone] = await embedder.embedTexts([text]);
        assert.ok(cosine(together[i], alone) > 0.99999, `text ${i}`);
      }
    });
  });

  it("gives a bad file an Error in its own slot and its neighbours their vectors", async () => {
    const bad = join(dir, "bad");
    const notPicture = join(dir, "notes.png");
    writeFileSync(notPicture, "hello, not a picture");
    const empty = join(dir, "empty.wav");
    writeFileSync(empty, "");
    const truncated = join(dir, "truncated.png");
    writeFileSync(truncated, readFileSync(join(REFERENCE_DIR, "screen.png")).subarray(0, 3000));
    const good = join(REFERENCE_DIR, "screen.png"); // any picture will do here
    const speech = join(REFERENCE_DIR, "speech.wav");
    const pid = manager.servers().index.pid;

    const images = await embedder.embedImages([notPicture, good, join(bad, "missing.png"), truncated, speech, good]);
    assert.equal(images.length, 6);
    assert.match(String(images[0]), /Failed to load image/);
    assert.ok(images[1] instanceof Float32Array);
    assert.match(String(images[2]), /ENOENT/);
    assert.match(String(images[3]), /Failed to load image/);
    assert.match(String(images[4]), /not an image/);
    assert.ok(images[5] instanceof Float32Array);
    assert.ok(cosine(images[1] as Float32Array, images[5] as Float32Array) > 0.99999);

    const sounds = await embedder.embedAudio([good, speech, empty]);
    assert.match(String(sounds[0]), /not audio/);
    assert.ok(cosine(sounds[1] as Float32Array, stored.speech) >= AGREEMENT);
    assert.ok(sounds[2] instanceof Error);

    assert.equal(manager.servers().index.pid, pid, "the server survived");
  });

  it("refuses media on the query encoder", async () => {
    const query = await manager.query();
    await assert.rejects(query.embedImages([join(REFERENCE_DIR, "screen.png")]), /text only/);
  });

  it("answers a query at once while the index server is busy (DigUp's query encoder runs apart too)", async () => {
    const query = await manager.query();
    await query.embedTexts([Prompts.query("warm up")]);
    // About 29,000 tokens: some 2 s of work for the index server.
    const chunks = Array.from({ length: 16 }, (_, i) => `${i} ${referenceTexts()[4].text}`);
    let indexed = 0;
    const busy = embedder.embedTexts(chunks).then(() => (indexed = performance.now()));
    await sleep(150);
    const began = performance.now();
    await query.embedTexts([Prompts.query("payment declined error")]);
    const answered = performance.now();
    await busy;
    // Behind the batch it took about 1.1 s; on its own server 6-40 ms.
    assert.ok(answered < indexed, "the query came back before the batch");
    assert.ok(answered - began < 400, `the query took ${Math.round(answered - began)} ms`);
  });

  it("keeps all the tokens of a picture sized for DigUp's largest budget, 1120", { skip: imageSkip }, async () => {
    const out = join(dir, "photo-1120.png");
    const [sized] = await sizeImages([{ path: join(REFERENCE_DIR, "photo.jpg"), budget: 1120, out }]);
    const image = {
      type: "image_url",
      image_url: { url: `data:image/png;base64,${readFileSync(out).toString("base64")}` },
    };
    const answer = await post("/v1/embeddings", { input: [{ content: [image] }], encoding_format: "float" });
    assert.equal(answer.status, 200);
    // A soft token per 48 x 48 pixels, plus <bos>, <|image>, <image|> and <eos>. At -ub 2048 the server would have
    // capped the picture at 1024 tokens and shrunk it.
    const cells = (sized.width / 48) * (sized.height / 48);
    assert.ok(cells > 1024, `${sized.width}x${sized.height}`);
    assert.equal(answer.json.usage.prompt_tokens, cells + 4);
    assert.ok(!readFileSync(join(dir, "logs", "llama-index.log"), "utf8").includes("cap image_max_tokens"));
  });

  it("logs the server to a file, its command line first", () => {
    const log = join(dir, "logs", "llama-index.log");
    assert.ok(statSync(log).isFile());
    const first = readFileSync(log, "utf8").split("\n")[0];
    assert.match(
      first,
      /^--- \d{4}-\d\d-\d\dT\S+ .*\/llama-server -m .*embeddinggemma-2-Q8_0\.gguf --mmproj .* --embeddings /,
    );
    assert.match(first, / -c 2304 -b 2304 -ub 2304 -np 1 /);
    assert.ok(existsSync(join(dir, "logs", "llama-index.pid")));
  });

  it("starts a server that crashed again on the next request", async () => {
    const before = manager.servers().index.pid!;
    process.kill(before, "SIGKILL");
    await waitFor("the crash to be noticed", () => manager.servers().index.pid !== before);
    const [vector] = await embedder.embedTexts([referenceTexts()[0].text]);
    assert.ok(cosine(vector, stored.query) >= AGREEMENT);
    const after = manager.servers().index;
    assert.equal(after.state, "ready");
    assert.ok(after.pid && after.pid !== before);
  });
});

// ---------------------------------------------------------------------------------------------------------------------

describe("server lifecycle", { skip: serverSkip }, () => {
  const allOff = { query: { state: "off", pid: null, port: null }, index: { state: "off", pid: null, port: null } };
  let manager: EmbedderManager;
  let logs: string;
  before(() => {
    if (!server) return;
    logs = join(scratch(), "logs");
    manager = makeManager(server, logs, { queryIdleSeconds: 1, indexLingerSeconds: 1 });
  });
  after(async () => {
    await manager?.stop();
  });

  it("starts the text-only server for queries and stops it when idle", async () => {
    assert.equal(manager.state(), "off");
    const starting = manager.query();
    assert.equal(manager.state(), "starting");
    const query = await starting;
    assert.equal(manager.state(), "ready");
    const { pid } = manager.servers().query;
    assert.equal(manager.servers().index.state, "off");
    await query.embedTexts([Prompts.query("hello")]);
    await waitFor("the idle stop", () => manager.servers().query.state === "off", 5000);
    assert.equal(manager.state(), "off");
    await waitFor("the process to exit", () => !alive(pid!));
  });

  it("keeps the query server apart from the index server, each on its own timer", async () => {
    const index = await manager.index();
    const indexPid = manager.servers().index.pid!;
    assert.equal(manager.state(), "off", "meaning search waits for the query server, not the index server");
    const query = await manager.query();
    const queryPid = manager.servers().query.pid!;
    assert.notEqual(queryPid, indexPid);
    await query.embedTexts([Prompts.query("hello")]);
    // Indexing again leaves the query server alone.
    await manager.index();
    assert.equal(manager.servers().query.pid, queryPid);
    await index.embedTexts([Prompts.document(null, "one more")]);
    // The query server's idle stop comes while indexing goes on; the index server's linger only after it.
    await waitFor("the query server's idle stop", () => manager.servers().query.state === "off", 5000);
    assert.equal(manager.servers().index.state, "ready");
    manager.doneIndexing();
    await sleep(500);
    assert.equal(manager.servers().index.state, "ready", "still lingering");
    await waitFor("the linger to end", () => manager.servers().index.state === "off", 5000);
    await waitFor("the processes to exit", () => !alive(indexPid) && !alive(queryPid));
  });

  it("lets a request after doneIndexing() run, and still stops after the linger", async () => {
    const index = await manager.index();
    manager.doneIndexing();
    await sleep(600);
    await index.embedTexts([Prompts.document(null, "a late one")]);
    assert.equal(manager.servers().index.state, "ready");
    await waitFor("the linger to end", () => manager.servers().index.state === "off", 5000);
  });

  it("cancels the linger when indexing starts again", async () => {
    await manager.index();
    manager.doneIndexing();
    const embedder = await manager.index();
    await sleep(1500);
    assert.equal(manager.servers().index.state, "ready");
    await embedder.embedTexts([Prompts.document(null, "still here")]);
    await manager.stop();
    assert.deepEqual(manager.servers(), allOff);
  });

  it("refuses work on a handle from before stop(), and starts no server for it", async () => {
    const index = await manager.index();
    const query = await manager.query();
    await manager.stop();
    await assert.rejects(index.embedTexts([Prompts.document(null, "late")]), /stopped/);
    await assert.rejects(index.embedImages([join(REFERENCE_DIR, "screen.png")]), /stopped/);
    await assert.rejects(query.embedTexts([Prompts.query("late")]), /stopped/);
    await sleep(300);
    assert.deepEqual(manager.servers(), allOff);
    // A new handle works.
    await (await manager.query()).embedTexts([Prompts.query("again")]);
    await manager.stop();
  });

  it("ends a request in flight at stop() without starting the server again", async () => {
    const index = await manager.index();
    const busy = index.embedTexts(Array.from({ length: 16 }, (_, i) => `${i} ${referenceTexts()[4].text}`));
    const refused = assert.rejects(busy, /stopped/); // before stop(): it rejects while stop() still waits
    await sleep(300);
    await manager.stop();
    await refused;
    await sleep(500);
    assert.deepEqual(manager.servers(), allOff);
  });

  it("stops a server left over by a daemon that was killed outright", async () => {
    await manager.index();
    const orphan = manager.servers().index.pid!;
    // A new daemon with the same support folder finds the old server through its pid file, at once: with nothing left
    // to index it may never start a server of its own.
    const next = makeManager(server!, logs);
    try {
      await waitFor("the leftover to be stopped", () => !alive(orphan));
      assert.equal(next.servers().index.pid, null);
      await next.index();
      assert.notEqual(next.servers().index.pid, orphan);
    } finally {
      await next.stop();
      await manager.stop();
    }
  });
});
