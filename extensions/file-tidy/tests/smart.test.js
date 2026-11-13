import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import jpeg from "jpeg-js";
import { analyze } from "../src/core/analyze.js";
import { buildExtIndex, buildFolderNamer, organizedDirNames } from "../src/core/config.js";
import { executePlan } from "../src/core/execute.js";
import { checkHealth } from "../src/core/health.js";
import { moveFile } from "../src/core/move.js";
import { clusterByHash, hashImages, loadHashCache, saveHashCache } from "../src/core/phash.js";
import { buildPlan } from "../src/core/plan.js";
import { buildSubIndex, scanSource, subClassify } from "../src/core/scan.js";
import { findSimilar } from "../src/core/similar.js";

const BASE = {
  dest: null,
  categories: {
    Images: ["jpg", "jpeg", "png"],
    Documents: ["pdf", "epub", "txt", "xlsx"],
    Archives: ["dmg", "zip"],
  },
  fallbackCategory: "Others",
  folderPrefix: "ft_",
  granularity: { Images: "month", Documents: "year", Archives: "none", Others: "none" },
  subCategories: {
    Images: [{ name: "Screenshots", match: ["screen ?shot", "截屏"] }],
    Documents: [{ name: "Ebooks", exts: ["epub"] }],
    Archives: [{ name: "Installers", exts: ["dmg"] }],
  },
  detect: { similar: false, health: false, perceptual: false },
  perceptualThreshold: 5,
  _path: "(test)",
};

const cfg = (over = {}) => ({ ...structuredClone(BASE), ...over });
const now = new Date();
const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const yr = String(now.getFullYear());

const tmpDirs = [];
after(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tidy-smart-"));
  tmpDirs.push(dir);
  return dir;
}
function write(dir, rel, content) {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
}
function rel(entry, destDir) {
  return path.relative(destDir, entry.to);
}

// ---------- Folder prefix ----------

test("prefix: every folder created in a fresh destination carries ft_", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "a.txt", "aaa");
  write(src, "b.jpg", "bbb");

  const { entries } = await analyze({ sourceDir: src, destDir: dest, config: cfg() });
  const paths = entries.map((e) => rel(e, dest)).sort();
  assert.deepEqual(paths, [path.join("ft_Documents", yr, "a.txt"), path.join("ft_Images", ym, "b.jpg")]);
});

test("prefix: an existing un-prefixed archive folder is reused instead of split in two", async () => {
  const src = tmp();
  const dest = tmp();
  fs.mkdirSync(path.join(dest, "Images", "2020-01"), { recursive: true });
  write(src, "b.jpg", "bbb");
  write(src, "a.txt", "aaa");

  const { entries } = await analyze({ sourceDir: src, destDir: dest, config: cfg() });
  const byName = Object.fromEntries(entries.map((e) => [e.name, rel(e, dest)]));
  // Images exists un-prefixed -> reuse it; Documents doesn't -> use the new prefix
  assert.equal(byName["b.jpg"], path.join("Images", ym, "b.jpg"));
  assert.equal(byName["a.txt"], path.join("ft_Documents", yr, "a.txt"));
});

test("prefix: an empty folderPrefix behaves exactly like the pre-prefix versions", () => {
  const dest = tmp();
  const name = buildFolderNamer(dest, cfg({ folderPrefix: "" }));
  assert.equal(name("Images"), "Images");
});

test("organizedDirNames: pre-prefix names carry both spellings, names added in 0.5.0 only the prefixed one", () => {
  const names = organizedDirNames(cfg());
  for (const n of ["Images", "ft_Images", "Duplicates", "ft_Duplicates", "ft_Review", "Others", "ft_Others"]) {
    assert.ok(names.has(n), `missing ${n}`);
  }
  // Review only exists from 0.5.0 on, so an un-prefixed one can only be the user's own
  assert.ok(!names.has("Review"));
});

test("prefix reuse: never adopts the user's own Review folder", () => {
  const dest = tmp();
  fs.mkdirSync(path.join(dest, "Review"));
  const name = buildFolderNamer(dest, cfg());
  assert.equal(name("Review"), "ft_Review");
});

test("prefix reuse: skips a same-named plain file, which would die with ENOTDIR at execution", () => {
  const dest = tmp();
  write(dest, "Images", "just a file named Images");
  const name = buildFolderNamer(dest, cfg());
  assert.equal(name("Images"), "ft_Images");
});

test("quarantine folders from a previous prefix are still skipped and never act as dedup keepers", async () => {
  const src = tmp();
  const dest = tmp();
  write(dest, path.join("ft_Duplicates", "old.jpg"), "SHARED");
  write(src, "new.jpg", "SHARED");

  const { entries } = await analyze({ sourceDir: src, destDir: dest, config: cfg({ folderPrefix: "" }) });
  assert.equal(entries[0].action, "archive");
});

test("a config missing newer categories is reported, never silently patched", async () => {
  const home = tmp();
  const cfgPath = path.join(home, "tidy", "config.json");
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  // A config an older version would have written: five categories, no Fonts
  fs.writeFileSync(
    cfgPath,
    JSON.stringify({
      dest: null,
      categories: { Images: ["jpg"], Videos: ["mp4"], Audios: ["mp3"], Documents: ["pdf"], Archives: ["zip"] },
      fallbackCategory: "Others",
    }),
  );

  // config.js resolves its path at module load, so run a child process with a patched XDG_CONFIG_HOME
  const { execFileSync } = await import("node:child_process");
  const script = `
    import { loadConfig } from ${JSON.stringify(new URL("../src/core/config.js", import.meta.url).href)};
    const c = loadConfig();
    console.log(JSON.stringify({ stale: c._staleCategories, cats: Object.keys(c.categories) }));
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    env: { ...process.env, XDG_CONFIG_HOME: home },
    encoding: "utf8",
  });
  const { stale, cats } = JSON.parse(out.trim().split("\n").pop());
  assert.deepEqual(stale, ["Fonts"]); // reported
  assert.ok(!cats.includes("Fonts")); // but not added behind the user's back
});

// ---------- Date depth ----------

test("date depth: month / year / none each take effect", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "p.jpg", "img");
  write(src, "d.txt", "doc");
  write(src, "z.zip", "arc");

  const { entries } = await analyze({ sourceDir: src, destDir: dest, config: cfg() });
  const byName = Object.fromEntries(entries.map((e) => [e.name, rel(e, dest)]));
  assert.equal(byName["p.jpg"], path.join("ft_Images", ym, "p.jpg")); // month
  assert.equal(byName["d.txt"], path.join("ft_Documents", yr, "d.txt")); // year
  assert.equal(byName["z.zip"], path.join("ft_Archives", "z.zip")); // none
});

// ---------- Subcategories ----------

test("subcategories: extension and filename rules both apply, above the date level", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "Screenshot 2026-07-27.jpg", "shot");
  write(src, "novel.epub", "book");
  write(src, "Tool-1.0.0.dmg", "installer");
  write(src, "plain.jpg", "photo");

  const { entries } = await analyze({ sourceDir: src, destDir: dest, config: cfg() });
  const byName = Object.fromEntries(entries.map((e) => [e.name, rel(e, dest)]));
  assert.equal(
    byName["Screenshot 2026-07-27.jpg"],
    path.join("ft_Images", "Screenshots", ym, "Screenshot 2026-07-27.jpg"),
  );
  assert.equal(byName["novel.epub"], path.join("ft_Documents", "Ebooks", yr, "novel.epub"));
  assert.equal(byName["Tool-1.0.0.dmg"], path.join("ft_Archives", "Installers", "Tool-1.0.0.dmg"));
  assert.equal(byName["plain.jpg"], path.join("ft_Images", ym, "plain.jpg")); // no subcategory
});

test("subcategories: an unparsable regex is dropped, the rest of the rule still applies", () => {
  const index = buildSubIndex({ Documents: [{ name: "X", match: ["([bad"], exts: ["epub"] }] });
  const file = { name: "a.epub", ext: "epub" };
  assert.equal(subClassify(file, "Documents", index), "X");
});

test("hand-edited config: a value that should be a list is ignored, never iterated character by character", () => {
  // "jpg" instead of ["jpg"] must not register j/p/g as three extensions
  const index = buildExtIndex({ categories: { Images: "jpg", Documents: ["txt"] } });
  assert.equal(index.get("txt"), "Documents");
  assert.equal(index.has("j"), false);
  // A non-list rule set used to throw "is not iterable" straight at the user
  assert.equal(buildSubIndex({ Documents: 5, Images: [{ name: "Shots", exts: ["png"] }] }).size, 1);
});

test("category names carrying a NUL or a bidi override are rejected before anything moves", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "a.txt", "x");
  const file = {
    path: path.join(src, "a.txt"),
    name: "a.txt",
    ext: "txt",
    size: 1,
    birthtime: new Date(),
    mtime: new Date(),
  };

  for (const segment of ["a\0b", "‮gpj.exe"]) {
    await assert.rejects(
      buildPlan({
        sourceFiles: [file],
        duplicates: new Map(),
        destDir: dest,
        extIndex: new Map([["txt", segment]]),
        fallbackCategory: "Others",
        folderName: (b) => b,
      }),
      // A NUL used to reach executePlan and die there with node's own
      // TypeError, halfway through moving files and with no code to translate.
      (err) => err.code === "INVALID_SEGMENT",
      `expected ${JSON.stringify(segment)} to be refused`,
    );
  }
});

test("hand-edited config: a file holding nothing but null falls back to the defaults", async () => {
  const home = tmp();
  const cfgPath = path.join(home, "tidy", "config.json");
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  // Valid JSON carrying no settings — what emptying the file by hand tends to
  // leave behind. Every property read used to die on it with a bare TypeError.
  fs.writeFileSync(cfgPath, "null");

  // config.js resolves its path at module load, so run a child process with a patched XDG_CONFIG_HOME
  const { execFileSync } = await import("node:child_process");
  const script = `
    import { loadConfig } from ${JSON.stringify(new URL("../src/core/config.js", import.meta.url).href)};
    const c = loadConfig();
    console.log(JSON.stringify({ cats: Object.keys(c.categories), prefix: c.folderPrefix, stale: c._staleCategories }));
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    env: { ...process.env, XDG_CONFIG_HOME: home },
    encoding: "utf8",
  });
  const { cats, prefix, stale } = JSON.parse(out.trim().split("\n").pop());
  assert.ok(cats.includes("Images"));
  assert.equal(prefix, "ft_");
  assert.deepEqual(stale, []); // nothing was configured, so nothing is missing
});

// ---------- Near-duplicates ----------

test("near-duplicates: only the newest release in a version group is marked best", () => {
  const files = [
    { path: "/a/App-1.0.5.dmg", name: "App-1.0.5.dmg", ext: "dmg", size: 100 },
    { path: "/a/App-1.0.6.dmg", name: "App-1.0.6.dmg", ext: "dmg", size: 100 },
    { path: "/a/App-1.0.10.dmg", name: "App-1.0.10.dmg", ext: "dmg", size: 100 },
  ];
  const found = findSimilar(files);
  assert.equal(found.size, 3);
  assert.equal(found.get("/a/App-1.0.10.dmg").best, true); // 1.0.10 > 1.0.6, compared numerically
  assert.equal(found.get("/a/App-1.0.5.dmg").best, false);
  assert.equal(found.get("/a/App-1.0.5.dmg").reason, "versioned");
});

test("near-duplicates: names matching once watermarks and copy markers are stripped group together, largest wins", () => {
  const files = [
    { path: "/a/CSS权威指南 第3版.pdf", name: "CSS权威指南 第3版.pdf", ext: "pdf", size: 900 },
    {
      path: "/a/CSS权威指南（第3版）(jb51.net).pdf",
      name: "CSS权威指南（第3版）(jb51.net).pdf",
      ext: "pdf",
      size: 500,
    },
  ];
  const found = findSimilar(files);
  assert.equal(found.size, 2);
  assert.equal(found.get("/a/CSS权威指南 第3版.pdf").best, true);
  assert.equal(found.get("/a/CSS权威指南 第3版.pdf").reason, "normalized-name");
});

test("near-duplicates: the same name in another format is reported as same-stem", () => {
  const files = [
    { path: "/a/report.pdf", name: "report.pdf", ext: "pdf", size: 900 },
    { path: "/a/report.epub", name: "report.epub", ext: "epub", size: 100 },
  ];
  const found = findSimilar(files);
  assert.equal(found.get("/a/report.pdf").reason, "same-stem");
  assert.equal(found.get("/a/report.pdf").best, true);
});

test("near-duplicates: names too short to be meaningful never group", () => {
  const files = [
    { path: "/a/a.pdf", name: "a.pdf", ext: "pdf", size: 1 },
    { path: "/a/b.pdf", name: "b.pdf", ext: "pdf", size: 1 },
  ];
  assert.equal(findSimilar(files).size, 0);
});

test("near-duplicates: flagged only, the destination is unchanged", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "Guide-1.0.0.zip", "one");
  write(src, "Guide-2.0.0.zip", "two");

  const { entries, counts } = await analyze({
    sourceDir: src,
    destDir: dest,
    config: cfg({ detect: { similar: true, health: false, perceptual: false } }),
  });
  assert.equal(counts.similar, 2);
  assert.ok(entries.every((e) => e.action === "archive")); // still archived normally
  assert.ok(entries.every((e) => rel(e, dest).startsWith("ft_Archives")));
});

// ---------- Health checks ----------

test("health: zero-byte files, magic-number mismatches and OS junk are all recognised", () => {
  const dir = tmp();
  const empty = write(dir, "empty.pdf", "");
  const fake = write(dir, "fake.pdf", "this is definitely not a pdf");
  const real = write(dir, "real.pdf", "%PDF-1.7\nreal enough");
  const junk = write(dir, ".DS_Store", "junk");
  const unknown = write(dir, "thing.xyz", "whatever");

  const files = [empty, fake, real, junk, unknown].map((p) => ({
    path: p,
    name: path.basename(p),
    ext: path.extname(p).slice(1).toLowerCase(),
    size: fs.statSync(p).size,
  }));
  const issues = checkHealth(files);
  assert.equal(issues.get(empty).issue, "empty");
  assert.equal(issues.get(fake).issue, "corrupt");
  assert.equal(issues.has(real), false);
  assert.equal(issues.get(junk).issue, "junk");
  assert.equal(issues.has(unknown), false); // an unknown extension is never judged
});

test("health: flagged files go to ft_Review/<issue>/, sound files are unaffected", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "ok.txt", "fine");
  write(src, "empty.pdf", "");
  write(src, ".DS_Store", "junk");

  const { entries, counts } = await analyze({
    sourceDir: src,
    destDir: dest,
    config: cfg({ detect: { similar: false, health: true, perceptual: false } }),
  });
  const byName = Object.fromEntries(entries.map((e) => [e.name, rel(e, dest)]));
  assert.equal(counts.review, 2);
  assert.equal(byName["empty.pdf"], path.join("ft_Review", "empty", "empty.pdf"));
  assert.equal(byName[".DS_Store"], path.join("ft_Review", "junk", ".DS_Store"));
  assert.equal(byName["ok.txt"], path.join("ft_Documents", yr, "ok.txt"));
});

test("detect: false turns off every pass at once, including ones added later", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "a.txt", "fine");
  write(src, ".DS_Store", "junk");
  write(src, "Guide-1.0.0.zip", "one");
  write(src, "Guide-2.0.0.zip", "two");

  const phases = [];
  const { entries, counts } = await analyze({
    sourceDir: src,
    destDir: dest,
    config: cfg({ detect: false }),
    onPhase: (phase) => phases.push(phase),
  });
  assert.ok(!phases.includes("health") && !phases.includes("similar") && !phases.includes("perceptual"));
  assert.equal(counts.review + counts.similar + counts.perceptual, 0);
  assert.ok(entries.every((e) => e.action === "archive"));
});

test("with health checks off, .DS_Store never enters the scan at all", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "ok.txt", "fine");
  write(src, ".DS_Store", "junk");

  const { entries } = await analyze({ sourceDir: src, destDir: dest, config: cfg() });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, "ok.txt");
});

test("health runs before dedup: byte-identical junk all goes to review, never judged duplicates", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, path.join("sub1", ".DS_Store"), "same junk bytes");
  write(src, path.join("sub2", ".DS_Store"), "same junk bytes");

  const { counts } = await analyze({
    sourceDir: src,
    destDir: dest,
    recursive: true,
    config: cfg({ detect: { similar: false, health: true, perceptual: false } }),
  });
  assert.equal(counts.review, 2);
  assert.equal(counts.duplicate, 0);
});

test("health: bare-frame MP3, mdat-leading MOV and AIFC are no longer misjudged as corrupt", () => {
  const dir = tmp();
  const mp3 = write(dir, "bare.mp3", Buffer.from([0xff, 0xfa, 0x90, 0x00, 0x11, 0x22, 0x33, 0x44]));
  const mov = write(dir, "old.mov", Buffer.concat([Buffer.from([0, 0, 0, 8]), Buffer.from("mdat12345678")]));
  const aifc = write(dir, "c.aiff", Buffer.from("FORM\x00\x00\x00\x20AIFCrest-of-file"));
  const fake = write(dir, "fake.mp3", "definitely text");

  const files = [mp3, mov, aifc, fake].map((p) => ({
    path: p,
    name: path.basename(p),
    ext: path.extname(p).slice(1).toLowerCase(),
    size: fs.statSync(p).size,
  }));
  const issues = checkHealth(files);
  assert.equal(issues.has(mp3), false);
  assert.equal(issues.has(mov), false);
  assert.equal(issues.has(aifc), false);
  assert.equal(issues.get(fake).issue, "corrupt");
});

test("scanSource skips hidden files by default; includeJunk only adds known junk names", () => {
  const src = tmp();
  write(src, ".DS_Store", "junk");
  write(src, ".env", "SECRET=1"); // hidden but not junk — must never be collected
  write(src, "a.txt", "a");

  assert.deepEqual(
    scanSource(src)
      .map((f) => f.name)
      .sort(),
    ["a.txt"],
  );
  assert.deepEqual(
    scanSource(src, { includeJunk: true })
      .map((f) => f.name)
      .sort(),
    [".DS_Store", "a.txt"],
  );
});

// ---------- Perceptual hashing ----------

/**
 * Build a gradient image. Coordinates are normalised by width/height, so the
 * same `shift` at a different resolution draws the same picture — exactly what
 * perceptual hashing is meant to recognise as "re-exported at another size".
 */
function makeJpeg(dir, name, { width = 64, height = 64, shift = 0, quality = 90 }) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const u = x / width;
      const v = y / height;
      data[i] = Math.round((u * 200 + shift) % 256);
      data[i + 1] = Math.round(v * 200);
      data[i + 2] = Math.round(((u + v) / 2) * 200);
      data[i + 3] = 255;
    }
  }
  const { data: jpg } = jpeg.encode({ data, width, height }, quality);
  return write(dir, name, jpg);
}

test("phash: exports of one image at different sizes/qualities cluster, the largest is best", async () => {
  const dir = tmp();
  const big = makeJpeg(dir, "orig.jpg", { width: 128, height: 128, quality: 95 });
  const small = makeJpeg(dir, "resized.jpg", { width: 64, height: 64, quality: 60 });
  const other = makeJpeg(dir, "different.jpg", { width: 64, height: 64, shift: 128, quality: 90 });

  const files = [big, small, other].map((p) => ({
    path: p,
    name: path.basename(p),
    ext: "jpg",
    size: fs.statSync(p).size,
  }));
  const hashes = await hashImages(files);
  assert.equal(hashes.size, 3);

  const clusters = clusterByHash(hashes, new Map(files.map((f) => [f.path, f])), 5);
  assert.equal(clusters.has(big), true);
  assert.equal(clusters.has(small), true);
  assert.equal(clusters.get(big).best, true); // the largest copy
  assert.equal(clusters.has(other), false); // different content, no cluster
});

test("phash: an undecodable file is skipped rather than fatal", async () => {
  const dir = tmp();
  const broken = write(dir, "broken.jpg", "not a jpeg at all");
  const hashes = await hashImages([{ path: broken, name: "broken.jpg", ext: "jpg", size: 17 }]);
  assert.equal(hashes.size, 0);
});

test("phash: an image that vanishes between the scan and the decoding is skipped, not fatal", async () => {
  const dir = tmp();
  const kept = makeJpeg(dir, "kept.jpg", { width: 64, height: 64, quality: 90 });
  const gone = write(dir, "gone.jpg", "placeholder");
  const files = [
    { path: kept, name: "kept.jpg", ext: "jpg", size: fs.statSync(kept).size },
    { path: gone, name: "gone.jpg", ext: "jpg", size: 11 },
  ];
  fs.unlinkSync(gone);

  const hashes = await hashImages(files);
  assert.equal(hashes.size, 1); // the surviving image was still hashed
  assert.ok(hashes.has(kept));
});

test("phash: flagged only, the destination is unchanged", async () => {
  const src = tmp();
  const dest = tmp();
  makeJpeg(src, "a.jpg", { width: 128, height: 128, quality: 95 });
  makeJpeg(src, "b.jpg", { width: 64, height: 64, quality: 60 });

  const { entries, counts } = await analyze({
    sourceDir: src,
    destDir: dest,
    config: cfg({ detect: { similar: false, health: false, perceptual: true } }),
  });
  assert.equal(counts.perceptual, 2);
  assert.ok(entries.every((e) => e.action === "archive"));
});

test("phash: the cache hits on path+size+mtime and survives a round trip to disk", async () => {
  const dir = tmp();
  const p = makeJpeg(dir, "a.jpg", {});
  const stat = fs.statSync(p);
  const file = { path: p, name: "a.jpg", ext: "jpg", size: stat.size, mtime: stat.mtime };

  const cache = new Map();
  const first = await hashImages([file], { cache });
  assert.equal(cache.get(p).hash, first.get(p));

  saveHashCache(dir, cache, [file]);
  const loaded = loadHashCache(dir);
  assert.equal(loaded.get(p).hash, first.get(p));

  // A real hit: swap in undecodable content of the same size and restore mtime —
  // still the cached hash, which proves nothing was decoded again
  const stat2 = fs.statSync(p);
  fs.writeFileSync(p, Buffer.alloc(stat.size, 1));
  fs.utimesSync(p, stat2.atime, stat.mtime);
  const again = await hashImages([file], { cache: loaded });
  assert.equal(again.get(p), first.get(p));
});

test("phash: a cross-volume move keeps the source mtime, so the re-keyed cache entry still hits", async () => {
  const dir = tmp();
  const from = makeJpeg(dir, "a.jpg", {});
  const stat = fs.statSync(from);
  const file = { path: from, name: "a.jpg", ext: "jpg", size: stat.size, mtime: stat.mtime };
  const cache = new Map();
  const first = await hashImages([file], { cache });

  // Forced onto the copy+verify+unlink path, as when the destination sits on
  // another volume.
  const to = path.join(dir, "moved.jpg");
  const exdev = () => {
    const e = new Error("cross-device link");
    e.code = "EXDEV";
    throw e;
  };
  moveFile(from, to, exdev);
  assert.equal(fs.statSync(to).mtime.getTime(), stat.mtime.getTime()); // the copy did not get a fresh mtime

  // Same-size garbage in place of the pixels, mtime kept: only a cache hit can
  // reproduce the hash, so equality proves the image was not decoded again.
  fs.writeFileSync(to, Buffer.alloc(stat.size, 1));
  fs.utimesSync(to, stat.atime, stat.mtime);
  const rekeyed = new Map([[to, cache.get(from)]]); // executePlan re-keys entries to final paths
  const again = await hashImages([{ ...file, path: to, mtime: fs.statSync(to).mtime }], { cache: rekeyed });
  assert.equal(again.get(to), first.get(from));
});

test("phash: saving merges the disk cache — another run's entries survive, dead paths still drop", () => {
  const dest = tmp();
  const ours = write(dest, "ours.jpg", "a");
  const theirs = write(dest, "theirs.jpg", "b");
  const dead = path.join(dest, "gone.jpg"); // never created
  const entry = (n) => ({ size: n, mtimeMs: n, hash: BigInt(n) });

  // Another run finished between this run's cache load and its save: it
  // persisted an entry this run never saw, a stale entry for a since-deleted
  // file, and an outdated entry for a path this run re-hashed.
  saveHashCache(
    dest,
    new Map([
      [ours, entry(9)],
      [theirs, entry(2)],
      [dead, entry(3)],
    ]),
    [{ path: ours }, { path: theirs }, { path: dead }],
  );

  saveHashCache(dest, new Map([[ours, entry(1)]]), [{ path: ours }]);

  const loaded = loadHashCache(dest);
  assert.deepEqual(loaded.get(ours), entry(1)); // this run's entry wins on a shared key
  assert.deepEqual(loaded.get(theirs), entry(2)); // the other run's entry survives the save
  assert.equal(loaded.has(dead), false); // pruning still drops paths that no longer exist
});

test("phash: a preview against a missing destination leaves no trace on disk", async () => {
  const src = tmp();
  const dest = path.join(tmp(), "archive"); // never created
  makeJpeg(src, "a.jpg", {});

  await analyze({
    sourceDir: src,
    destDir: dest,
    config: cfg({ detect: { similar: false, health: false, perceptual: true } }),
  });
  // The hash cache used to be saved during analysis, mkdir-ing dest/.tidy into
  // existence before any confirmation — so a dry run had a lasting side effect
  // and the adapters' "destination doesn't exist, create it?" prompt never
  // fired, its existence check finding the directory already there.
  assert.equal(fs.existsSync(dest), false);
});

test("phash: a successful run persists the cache to dest/.tidy, keyed to where each image landed", async () => {
  const src = tmp();
  const dest = tmp();
  const orig = makeJpeg(src, "a.jpg", {});

  const config = cfg({ detect: { similar: false, health: false, perceptual: true } });
  const { entries, hashCache } = await analyze({ sourceDir: src, destDir: dest, config });
  assert.ok(!fs.existsSync(path.join(dest, ".tidy", "phash-cache.json"))); // analysis alone wrote nothing

  executePlan(entries, { destDir: dest, sourceDir: src, hashCache });
  const archived = path.join(dest, "ft_Images", ym, "a.jpg");
  assert.ok(fs.existsSync(archived));
  const loaded = loadHashCache(dest);
  // Remapped to the post-move path — an entry still keyed to the emptied
  // source would never hit again
  assert.equal(loaded.get(archived).hash, hashCache.cache.get(orig).hash);
  assert.ok(!loaded.has(orig));
});

test("phash: the whole pass is skipped when the source batch holds no hashable image", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "doc.txt", "no images here");
  makeJpeg(dest, path.join("ft_Images", "archived.jpg"), {});

  const phases = [];
  await analyze({
    sourceDir: src,
    destDir: dest,
    config: cfg({ detect: { similar: false, health: false, perceptual: true } }),
    onPhase: (phase) => phases.push(phase),
  });
  assert.ok(!phases.includes("perceptual"));
});

test("a duplicate named manifest.md steps aside, leaving the dedup manifest uncontaminated", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "notes.txt", "SAMEBYTES");
  write(src, "manifest.md", "SAMEBYTES");

  const config = cfg({ detect: { similar: false, health: false, perceptual: false } });
  const { entries } = await analyze({ sourceDir: src, destDir: dest, config });
  executePlan(entries, { destDir: dest, sourceDir: src });

  const dupDir = path.join(dest, "ft_Duplicates");
  // The user's file lands with a suffix, contents untouched
  assert.equal(fs.readFileSync(path.join(dupDir, "manifest (1).md"), "utf8"), "SAMEBYTES");
  // The manifest itself holds nothing but dedup records
  assert.ok(!fs.readFileSync(path.join(dupDir, "manifest.md"), "utf8").includes("SAMEBYTES"));
});

// ---------- End to end ----------

test("end to end: all four destinations at once, landing correctly and undoable", async () => {
  const src = tmp();
  const dest = tmp();
  // Real JPEG bytes: otherwise the health pass calls it corrupt and dedup never sees it
  const realJpeg = fs.readFileSync(makeJpeg(tmp(), "seed.jpg", {}));
  write(src, "photo.jpg", realJpeg);
  write(src, "photo copy.jpg", realJpeg); // byte-identical
  write(src, "broken.pdf", ""); // zero bytes
  write(src, "novel.epub", "PK\x03\x04fake-but-valid-magic");
  write(src, "App-1.0.0.dmg", "v1");
  write(src, "App-1.1.0.dmg", "v2"); // near-duplicate by version

  const config = cfg({ detect: { similar: true, health: true, perceptual: false } });
  const { entries, counts } = await analyze({ sourceDir: src, destDir: dest, config });
  assert.equal(counts.duplicate, 1);
  assert.equal(counts.review, 1);
  assert.equal(counts.similar, 2);

  executePlan(entries, { destDir: dest, sourceDir: src });
  assert.ok(fs.existsSync(path.join(dest, "ft_Images", ym, "photo.jpg")));
  assert.ok(fs.existsSync(path.join(dest, "ft_Duplicates", "photo copy.jpg")));
  // The keeper in the manifest must point where it actually landed, not at a source path that no longer exists
  const manifest = fs.readFileSync(path.join(dest, "ft_Duplicates", "manifest.md"), "utf8");
  assert.match(manifest, /ft_Images/);
  assert.ok(!manifest.includes(path.join(src, "photo.jpg")));
  assert.ok(fs.existsSync(path.join(dest, "ft_Review", "empty", "broken.pdf")));
  assert.ok(fs.existsSync(path.join(dest, "ft_Documents", "Ebooks", yr, "novel.epub")));
  assert.ok(fs.existsSync(path.join(dest, "ft_Archives", "Installers", "App-1.1.0.dmg")));
});

test("end to end: quarantined files are never rescanned as archived content", async () => {
  const src = tmp();
  const dest = tmp();
  // A duplicate quarantined by an earlier run
  write(dest, path.join("ft_Duplicates", "old.jpg"), "SHARED");
  write(src, "new.jpg", "SHARED");

  const { entries } = await analyze({ sourceDir: src, destDir: dest, config: cfg() });
  // If the quarantine folder acted as a keeper, this would come back as a duplicate
  assert.equal(entries[0].action, "archive");
});
