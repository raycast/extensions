const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { Readable } = require("node:stream");
const vm = require("node:vm");
const ts = require("typescript");

async function loadDownload({ directory, platform = process.platform, fetcher, overrides = {}, appleScript } = {}) {
  const toasts = [];
  const failures = [];
  const cache = new Map();
  async function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const compiledModule = { exports: {} };
    const imports = {};
    const source = await fs.readFile(filename, "utf8");
    for (const match of source.matchAll(/from "(\.[^"]+)"/g)) {
      imports[match[1]] = await load(path.resolve(path.dirname(filename), match[1] + ".ts"));
    }
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(
      compiled,
      {
        module: compiledModule,
        exports: compiledModule.exports,
        URL,
        Buffer,
        AbortSignal,
        Error,
        console,
        process: { platform, env: { SystemRoot: "C:\\Windows" } },
        fetch: fetcher,
        require(name) {
          if (overrides[name]) return overrides[name];
          if (imports[name]) return imports[name];
          if (name === "@raycast/api") {
            return {
              getPreferenceValues: () => ({ downloadDirectory: directory }),
              showToast: async (toast) => toasts.push(toast),
              Toast: { Style: { Animated: "animated", Success: "success" } },
            };
          }
          if (name === "@raycast/utils") {
            return {
              runAppleScript:
                appleScript ||
                (async () => {
                  throw new Error("Unexpected AppleScript");
                }),
              showFailureToast: async (error) => failures.push(error.message),
            };
          }
          return require(name);
        },
      },
      { filename },
    );
    cache.set(filename, compiledModule.exports);
    return compiledModule.exports;
  }
  return { ...(await load(path.resolve(__dirname, "../src/utils/download.ts"))), toasts, failures };
}

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "arena-download-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const directory = path.join(root, "Files with spaces Ω");
  await fs.mkdir(directory);
  return directory;
}

test("downloads binary data through a web stream and preserves signed URL parameters", async (t) => {
  const directory = await fixture(t);
  const payload = Buffer.from([0, 255, 17, 128, 10]);
  const url = "https://cdn.example/a%20b.png?token=abc%2Fdef&size=original";
  const client = await loadDownload({
    directory,
    fetcher: async (requested, options) => {
      assert.equal(requested, url);
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(payload);
    },
  });
  const saved = await client.downloadFile(url);
  assert.equal(saved, path.join(directory, "a b.png"));
  assert.deepEqual(await fs.readFile(saved), payload);
  assert.equal(client.toasts.at(-1).style, "success");
  assert.equal(client.failures.length, 0);
});

test("opaque URLs keep the filename and extension supplied by Are.na", async (t) => {
  const directory = await fixture(t);
  const url = "https://cdn.example/opaque-id?token=abc%2Fdef";
  const client = await loadDownload({
    directory,
    fetcher: async (requested) => {
      assert.equal(requested, url);
      return new Response("document");
    },
  });
  const saved = await client.downloadFile(url, "Résumé 2026.pdf");
  assert.equal(saved, path.join(directory, "Résumé 2026.pdf"));
  assert.equal(await fs.readFile(saved, "utf8"), "document");
  assert.equal(client.toasts.at(-1).style, "success");
});

test("long Unicode filenames keep their extension within the byte limit", async () => {
  const { getDownloadFilename } = await loadDownload();
  for (const extension of [".png", ".pdf"]) {
    const filename = "😀".repeat(100) + extension;
    for (const saved of [
      getDownloadFilename("https://cdn.example/" + encodeURIComponent(filename)),
      getDownloadFilename("https://cdn.example/opaque-id", filename),
    ]) {
      assert.ok(saved.endsWith(extension));
      assert.ok(Buffer.byteLength(saved) <= 180);
      assert.equal(saved.slice(0, -extension.length).replaceAll("😀", ""), "");
    }
  }
  assert.equal(getDownloadFilename("https://cdn.example/fallback.png", " "), "fallback.png");
  assert.equal(getDownloadFilename("https://cdn.example/id", "CON.pdf"), "_CON.pdf");
  assert.equal(getDownloadFilename("https://cdn.example/id", "../folder\\file.pdf"), ".._folder_file.pdf");
});

test("concurrent downloads keep an existing file and use different numbered destinations", async (t) => {
  const directory = await fixture(t);
  const existing = path.join(directory, "image.png");
  await fs.writeFile(existing, "original");
  const client = await loadDownload({ directory, fetcher: async () => new Response("new image") });
  const saved = await Promise.all([
    client.saveDownload("https://cdn.example/image.png"),
    client.saveDownload("https://cdn.example/image.png"),
  ]);
  assert.equal(new Set(saved).size, 2);
  assert.equal(await fs.readFile(existing, "utf8"), "original");
  for (const file of saved) assert.equal(await fs.readFile(file, "utf8"), "new image");
  assert.deepEqual((await fs.readdir(directory)).sort(), ["image (1).png", "image (2).png", "image.png"]);
});

test("HTTP errors show failure and never save an error page or success toast", async (t) => {
  const directory = await fixture(t);
  const client = await loadDownload({ directory, fetcher: async () => new Response("Not found", { status: 404 }) });
  assert.equal(await client.downloadFile("https://cdn.example/file.pdf"), null);
  assert.deepEqual(await fs.readdir(directory), []);
  assert.match(client.failures[0], /HTTP 404/);
  assert.equal(
    client.toasts.some((toast) => toast.style === "success"),
    false,
  );
});

test("empty response bodies fail without leaving a destination file", async (t) => {
  const directory = await fixture(t);
  const client = await loadDownload({ directory, fetcher: async () => new Response(null) });
  await assert.rejects(client.saveDownload("https://cdn.example/file.pdf"), /no body/);
  assert.deepEqual(await fs.readdir(directory), []);
});

test("interrupted Node streams remove incomplete files and preserve existing copies", async (t) => {
  const directory = await fixture(t);
  await fs.writeFile(path.join(directory, "file.pdf"), "keep this");
  const client = await loadDownload({
    directory,
    fetcher: async () => ({
      ok: true,
      body: Readable.from(
        (async function* () {
          yield Buffer.from("partial");
          throw new Error("Connection interrupted");
        })(),
      ),
    }),
  });
  await assert.rejects(client.saveDownload("https://cdn.example/file.pdf"), /Connection interrupted/);
  assert.deepEqual(await fs.readdir(directory), ["file.pdf"]);
  assert.equal(await fs.readFile(path.join(directory, "file.pdf"), "utf8"), "keep this");
});

test("stream errors during destination creation are handled and leave no partial file", async (t) => {
  const directory = await fixture(t);
  const body = new Readable({ read() {} });
  const client = await loadDownload({
    directory,
    fetcher: async () => ({ ok: true, body }),
    overrides: {
      "node:fs/promises": {
        ...fs,
        open: async (...args) => {
          body.destroy(new Error("Aborted while opening destination"));
          await new Promise(setImmediate);
          return fs.open(...args);
        },
      },
    },
  });
  await assert.rejects(client.saveDownload("https://cdn.example/file.png"), /Aborted while opening destination/);
  assert.deepEqual(await fs.readdir(directory), []);
});

test("write errors propagate without a success toast or partial file", async (t) => {
  const directory = await fixture(t);
  const client = await loadDownload({
    directory,
    fetcher: async () => new Response("image"),
    overrides: {
      "node:fs/promises": {
        ...fs,
        open: async () => {
          throw Object.assign(new Error("Permission denied"), { code: "EACCES" });
        },
      },
    },
  });
  assert.equal(await client.downloadFile("https://cdn.example/file.png"), null);
  assert.equal(
    client.toasts.some((toast) => toast.style === "success"),
    false,
  );
  assert.match(client.failures[0], /Permission denied/);
  assert.deepEqual(await fs.readdir(directory), []);
});

test("invalid protocols and URL credentials are rejected before fetch", async (t) => {
  const directory = await fixture(t);
  const client = await loadDownload({
    directory,
    fetcher: async () => {
      throw new Error("Should not fetch");
    },
  });
  for (const url of ["file:///tmp/example", "javascript:alert(1)", "relative.txt"]) {
    await assert.rejects(client.saveDownload(url), /HTTP or HTTPS/);
  }
  await assert.rejects(client.saveDownload("https://user:secret@cdn.example/file"), /login credentials/);
  assert.deepEqual(await fs.readdir(directory), []);
});

test("URL filenames cannot escape the destination and are valid for Windows", async () => {
  const { getDownloadFilename } = await loadDownload();
  assert.equal(getDownloadFilename("https://cdn.example/CON.txt?token=x"), "_CON.txt");
  assert.equal(getDownloadFilename("https://cdn.example/LPT%C2%B2.txt"), "_LPT².txt");
  assert.equal(getDownloadFilename("https://cdn.example/%2E%2E%2Ffolder%5Cevil.txt"), ".._folder_evil.txt");
  assert.equal(getDownloadFilename("https://cdn.example/bad%3A%2A%3F%00name.pdf"), "bad____name.pdf");
  assert.equal(getDownloadFilename("https://cdn.example/file.pdf.%20"), "file.pdf");
  assert.equal(getDownloadFilename("https://cdn.example/"), "download");
  assert.equal(getDownloadFilename("https://cdn.example/caf%C3%A9.png"), "café.png");
  assert.equal(getDownloadFilename("https://cdn.example/bad%ZZ.png"), "bad%ZZ.png");
  assert.ok(Buffer.byteLength(getDownloadFilename("https://cdn.example/" + "😀".repeat(100))) <= 180);
});

test("macOS resolves Downloads with a constant AppleScript rather than embedding a URL", async (t) => {
  const directory = await fixture(t);
  const client = await loadDownload({
    platform: "darwin",
    appleScript: async (script) => {
      assert.equal(script, "POSIX path of (path to downloads folder)");
      return directory + "/\n";
    },
  });
  assert.equal(await client.getDownloadsDirectory(), directory + "/");
});

test("Windows folder lookup uses redirected Downloads, a fixed script and hidden PowerShell", async () => {
  const redirected = "D:\\OneDrive - Example\\Téléchargements";
  const client = await loadDownload({
    platform: "win32",
    overrides: {
      "node:path": path.win32,
      "node:fs/promises": {
        stat: async (directory) => {
          assert.equal(directory, redirected);
          return { isDirectory: () => true };
        },
      },
      "node:child_process": {
        execFile: (executable, args, options, callback) => {
          assert.equal(executable, "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
          assert.deepEqual(Array.from(args).slice(0, 3), ["-NoProfile", "-NonInteractive", "-Command"]);
          assert.match(args[3], /NameSpace\('shell:Downloads'\)/);
          assert.match(args[3], /OutputEncoding/);
          assert.equal(options.windowsHide, true);
          assert.equal(options.timeout, 10000);
          callback(null, redirected + "\r\n");
        },
      },
    },
  });
  assert.equal(await client.getDownloadsDirectory(), redirected);
});

test("a configured Windows folder bypasses native discovery", async () => {
  const directory = "E:\\Research assets";
  const client = await loadDownload({
    directory,
    platform: "win32",
    overrides: {
      "node:path": path.win32,
      "node:fs/promises": { stat: async () => ({ isDirectory: () => true }) },
      "node:child_process": {
        execFile: () => {
          throw new Error("Unexpected PowerShell");
        },
      },
    },
  });
  assert.equal(await client.getDownloadsDirectory(), directory);
});

test("blocked native lookup directs the user to the folder preference", async () => {
  const client = await loadDownload({
    platform: "win32",
    overrides: {
      "node:child_process": {
        execFile: (_executable, _args, _options, callback) => callback(new Error("PowerShell unavailable")),
      },
    },
  });
  await assert.rejects(client.getDownloadsDirectory(), /Choose a Download Directory/);
});

test("missing directories and paths to files fail before downloading", async (t) => {
  const directory = await fixture(t);
  const file = path.join(directory, "regular-file");
  await fs.writeFile(file, "content");
  for (const configured of [file, path.join(directory, "missing"), "relative/path"]) {
    const client = await loadDownload({
      directory: configured,
      fetcher: async () => {
        throw new Error("Should not fetch");
      },
    });
    await assert.rejects(client.saveDownload("https://cdn.example/a.png"), /existing, accessible Download Directory/);
  }
});
