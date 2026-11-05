const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs/promises");
const { readFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const ts = require("typescript");

// Load the source with Raycast/API boundaries stubbed; no Raycast runtime or API key needed.
function loadSource(relativePath, stubs = {}) {
  const filename = path.resolve(__dirname, "../src", relativePath);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (id) => (Object.hasOwn(stubs, id) ? stubs[id] : module.require(id));
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  loaded._compile(outputText, filename);
  return loaded.exports;
}

const { buildPostsFromContent } = loadSource("lib/utils.ts");

for (const status of ["ready", "failed", "processing"]) {
  test(`draft form creates a draft only when every image is ready (${status})`, async () => {
    let config;
    let submitted;
    let cleared = false;
    let cleanedUp = false;
    const ui = new Proxy(() => {}, { get: () => ui });
    const { CreateDraftForm } = loadSource("commands/create-draft.tsx", {
      "react/jsx-runtime": { jsx: () => null, jsxs: () => null },
      react: {
        useState: (initial) => [initial, () => {}],
        useRef: (initial) => ({ current: initial }),
        useEffect: () => {},
        useMemo: (compute) => compute(),
      },
      "@raycast/api": {
        Action: ui,
        ActionPanel: ui,
        Form: ui,
        Icon: ui,
        Clipboard: {},
        Toast: { Style: {} },
        showToast: async () => ({}),
      },
      "@raycast/utils": {
        FormValidation: {},
        useCachedState: () => [undefined, () => {}],
        usePromise: () => ({}),
        useForm: (options) => {
          config = options;
          return {
            values: options.initialValues,
            itemProps: new Proxy({}, { get: () => ({}) }),
            reset: () => {
              cleared = true;
            },
            focus: () => {},
          };
        },
      },
      "../lib/api": {
        createDraft: async (socialSetId, payload) => {
          submitted = { socialSetId, payload };
          return { private_url: "https://typefully.com/test-draft" };
        },
      },
      "../lib/constants": loadSource("lib/constants.ts"),
      "../lib/preferences": {},
      "../components/api-key-required": {},
      "../lib/utils": loadSource("lib/utils.ts"),
      "../lib/clipboard-images": {
        validateImageFiles: async () => {},
        removeClipboardImages: async () => {
          cleanedUp = true;
        },
      },
      "../lib/media": {
        uploadMedia: async () => {
          if (status === "failed") throw new Error("Upload failed");
          return { media_id: "image-1", status };
        },
      },
    });
    CreateDraftForm({
      draftValues: { socialSetId: "42", content: "", images: ["image.png"], platforms: ["x", "linkedin"] },
    });
    assert.equal(config.validation.content(""), undefined);
    await config.onSubmit(config.initialValues);
    if (status === "ready") {
      assert.equal(submitted.socialSetId, 42);
      for (const platform of ["x", "linkedin"]) {
        assert.deepEqual(submitted.payload.platforms[platform].posts, [{ text: "", media_ids: ["image-1"] }]);
      }
      assert.equal(cleared, true);
      assert.equal(cleanedUp, true);
    } else {
      assert.equal(submitted, undefined);
      assert.equal(cleared, false);
      assert.equal(cleanedUp, false);
    }
  });
}

test("images attach only to the first thread post and to the merged LinkedIn post", () => {
  const content = "First\r\n---\r\nSecond";
  assert.deepEqual(buildPostsFromContent(content, true, ["image-1"]), [
    { text: "First", media_ids: ["image-1"] },
    { text: "Second" },
  ]);
  assert.deepEqual(buildPostsFromContent(content, false, ["image-1"]), [
    { text: "First\n\nSecond", media_ids: ["image-1"] },
  ]);
});

test("image-only drafts work and text-only payloads stay unchanged", () => {
  assert.deepEqual(buildPostsFromContent("  ", true, ["image-1"]), [{ text: "", media_ids: ["image-1"] }]);
  assert.deepEqual(buildPostsFromContent("", false, ["image-1"]), [{ text: "", media_ids: ["image-1"] }]);
  assert.deepEqual(buildPostsFromContent("", true), []);
  assert.deepEqual(buildPostsFromContent("Hello", true), [{ text: "Hello" }]);
});

async function temporaryDirectory(t) {
  const directory = await fs.mkdtemp(path.join(tmpdir(), "typefully-images-test-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

test("upload sends raw bytes with no extra headers and waits for ready media", async (t) => {
  const directory = await temporaryDirectory(t);
  const file = path.join(directory, "My image.PNG");
  await fs.writeFile(file, "image bytes");
  let polls = 0;
  const { uploadMedia } = loadSource("lib/media.ts", {
    "./api": {
      createMediaUpload: async (socialSetId, fileName) => {
        assert.equal(socialSetId, 42);
        assert.equal(fileName, "My_image.png");
        return { upload_url: "https://upload.example.test", media_id: "media-1" };
      },
      getMediaStatus: async () => ({ media_id: "media-1", status: ++polls === 1 ? "processing" : "ready" }),
    },
  });
  t.mock.method(global, "fetch", async (url, options) => {
    assert.equal(url, "https://upload.example.test");
    assert.equal(options.method, "PUT");
    assert.equal(options.headers, undefined);
    assert.equal(options.body.toString(), "image bytes");
    return { ok: true };
  });
  t.mock.method(global, "setTimeout", (callback) => queueMicrotask(callback));
  assert.equal((await uploadMedia(42, file)).status, "ready");
  assert.equal(polls, 2);
});

for (const scenario of ["upload failure", "processing failure", "timeout"]) {
  test(`handles ${scenario} without treating the image as ready`, async (t) => {
    const directory = await temporaryDirectory(t);
    const file = path.join(directory, "image.png");
    await fs.writeFile(file, "image bytes");
    let polls = 0;
    const { uploadMedia } = loadSource("lib/media.ts", {
      "./api": {
        createMediaUpload: async () => ({ upload_url: "https://upload.example.test", media_id: "media-1" }),
        getMediaStatus: async () => {
          polls++;
          return { media_id: "media-1", status: scenario === "processing failure" ? "failed" : "processing" };
        },
      },
    });
    t.mock.method(global, "fetch", async () => ({ ok: scenario !== "upload failure", status: 403 }));
    t.mock.method(global, "setTimeout", (callback) => queueMicrotask(callback));
    if (scenario === "timeout") {
      assert.equal((await uploadMedia(42, file)).status, "processing");
      assert.equal(polls, 30);
    } else {
      await assert.rejects(uploadMedia(42, file), scenario === "upload failure" ? /403/ : /failed to process/);
      assert.equal(polls, scenario === "upload failure" ? 0 : 1);
    }
    assert.equal(await fs.readFile(file, "utf8"), "image bytes");
  });
}

test("clipboard file URLs are snapshotted and cleanup preserves original files", async (t) => {
  const directory = await temporaryDirectory(t);
  const source = path.join(directory, "my image.PNG");
  await fs.writeFile(source, "original image");
  const helpers = loadSource("lib/clipboard-images.ts", {
    "@raycast/api": {
      Clipboard: { read: async () => ({ file: require("node:url").pathToFileURL(source).href }) },
      environment: { supportPath: path.join(directory, "support") },
    },
  });
  const snapshot = await helpers.readClipboardImage();
  assert.notEqual(snapshot, source);
  await fs.writeFile(source, "changed image");
  assert.equal(await fs.readFile(snapshot, "utf8"), "original image");
  await helpers.removeClipboardImages([source, snapshot]);
  assert.equal(await fs.readFile(source, "utf8"), "changed image");
  await assert.rejects(fs.stat(snapshot), { code: "ENOENT" });
  await assert.rejects(helpers.validateImageFiles([source, source, source, source, source]), /up to 4/);
  await assert.rejects(helpers.validateImageFiles([directory]), /Choose PNG/);
  await assert.rejects(helpers.validateImageFiles([path.join(directory, "missing.png")]), /unavailable/);
  const empty = path.join(directory, "empty.png");
  await fs.writeFile(empty, "");
  await assert.rejects(helpers.validateImageFiles([empty]), /empty or unavailable/);
});

test(
  "native macOS reader handles raw PNG, TIFF screenshots, and an empty clipboard",
  { skip: process.platform !== "darwin" },
  async (t) => {
    const directory = await temporaryDirectory(t);
    const board = `typefully-test-${require("node:crypto").randomUUID()}`;
    const execute = promisify(execFile);
    const source = path.join(directory, "image.png");
    await fs.writeFile(
      source,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGP4z8AARAwQCgAf7gP9i18U1AAAAABJRU5ErkJggg==",
        "base64",
      ),
    );
    const clipboardExec = () => {};
    clipboardExec[promisify.custom] = (command, args, options) => {
      const rewritten = args.map((arg) =>
        arg.replace("$.NSPasteboard.generalPasteboard", `$.NSPasteboard.pasteboardWithName(${JSON.stringify(board)})`),
      );
      return execute(command, rewritten, options);
    };
    const helpers = loadSource("lib/clipboard-images.ts", {
      "@raycast/api": { Clipboard: { read: async () => ({}) }, environment: { supportPath: directory } },
      "node:child_process": { execFile: clipboardExec },
    });
    async function setClipboard(file, type) {
      await execute("/usr/bin/osascript", [
        "-l",
        "JavaScript",
        "-e",
        `
      ObjC.import("AppKit");
      function run(argv) {
        const board = $.NSPasteboard.pasteboardWithName(argv[0]);
        board.clearContents;
        if (argv[1]) board.setDataForType($.NSData.dataWithContentsOfFile(argv[1]), argv[2]);
      }
    `,
        board,
        file,
        type,
      ]);
    }
    t.after(() =>
      execute("/usr/bin/osascript", [
        "-l",
        "JavaScript",
        "-e",
        `ObjC.import("AppKit"); $.NSPasteboard.pasteboardWithName(${JSON.stringify(board)}).releaseGlobally;`,
      ]),
    );
    for (const type of ["public.png", "public.tiff"]) {
      const file = type === "public.png" ? source : path.join(directory, "image.tiff");
      if (type === "public.tiff") await execute("/usr/bin/sips", ["-s", "format", "tiff", source, "--out", file]);
      await setClipboard(file, type);
      const image = await helpers.readClipboardImage();
      assert.equal((await fs.readFile(image)).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      await helpers.removeClipboardImages([image]);
    }
    await setClipboard("", "");
    await assert.rejects(helpers.readClipboardImage(), /Copy an image/);
    assert.deepEqual(await fs.readdir(path.join(directory, "draft-images")), []);
  },
);
