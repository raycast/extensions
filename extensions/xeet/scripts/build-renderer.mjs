// Rebuild Xeet with redistributable fonts; never copy the npm package's WASM.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectRustNotices } from "./collect-rust-notices.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstreamRevision = "71079ff11ab2847c1c2e5973b3901b2c7203c89d";
const work = join(root, ".build");
const upstream = join(work, "upstream");
const vendor = join(work, "open-vendor");
const output = join(root, "assets", "xeet");
const licenses = join(output, "licenses");
for (const dir of [work, join(vendor, "fonts"), licenses]) mkdirSync(dir, { recursive: true });

async function download(url, target) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}

if (!existsSync(join(upstream, "Cargo.toml"))) {
  await download(`https://codeload.github.com/rauchg/xeet/tar.gz/${upstreamRevision}`, join(work, "upstream.tar.gz"));
  mkdirSync(upstream, { recursive: true });
  execFileSync("tar", ["-xzf", join(work, "upstream.tar.gz"), "--strip-components=1", "-C", upstream]);
}

// The primary-face enum and family aliases are part of Xeet's selection rules.
// Only the font manifest changes: no Rust renderer code is patched. Font bytes
// and internal name tables remain unmodified except for the renamed emoji
// derivative converted below to the painter's supported bitmap format.
const manifest = JSON.parse(readFileSync(join(upstream, "assets/vendor/fonts/manifest.json"), "utf8"));
const openFaces = manifest.filter((face) => /^(Noto|STIX)/.test(face.file));
for (const face of openFaces)
  cpSync(join(upstream, "assets/vendor/fonts", face.file), join(vendor, "fonts", face.file));
const primary = [400, 500, 700, 800].map((weight) => ({
  kind: "chirp",
  family: "TwitterChirp",
  weight,
  subset: "latin",
  file: weight < 700 ? "NotoSans-Regular.ttf" : "NotoSans-Bold.ttf",
  ranges: [[0, 0x10ffff]],
}));

const sources = [
  [
    "googlefonts/noto-emoji",
    "8998f5dd683424a73e2314a8c1f1e359c19e8742",
    "fonts/NotoColorEmoji.ttf",
    join(vendor, "fonts/NotoColorEmoji.ttf"),
  ],
  [
    "googlefonts/noto-emoji",
    "8998f5dd683424a73e2314a8c1f1e359c19e8742",
    "LICENSE",
    join(licenses, "NotoColorEmoji-OFL.txt"),
  ],
  [
    "notofonts/noto-cjk",
    "f8d157532fbfaeda587e826d4cd5b21a49186f7c",
    "Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf",
    join(vendor, "fonts/NotoSansCJKjp-Regular.otf"),
  ],
  [
    "notofonts/noto-cjk",
    "f8d157532fbfaeda587e826d4cd5b21a49186f7c",
    "Sans/OTF/Japanese/NotoSansCJKjp-Bold.otf",
    join(vendor, "fonts/NotoSansCJKjp-Bold.otf"),
  ],
  [
    "notofonts/noto-cjk",
    "f8d157532fbfaeda587e826d4cd5b21a49186f7c",
    "Sans/LICENSE",
    join(licenses, "NotoSansCJK-OFL.txt"),
  ],
  ["notofonts/noto-fonts", "ffebf8c1ee449e544955a7e813c54f9b73848eac", "LICENSE", join(licenses, "Noto-OFL.txt")],
  ["stipub/stixfonts", "bea1dc9a3cc2d8b57e412dfd0f448a84382dfe46", "OFL.txt", join(licenses, "STIX-OFL.txt")],
];
for (const [repo, revision, path, target] of sources) {
  if (!existsSync(target)) await download(`https://raw.githubusercontent.com/${repo}/${revision}/${path}`, target);
}
const extra = [
  {
    kind: "emoji",
    family: "Apple Color Emoji",
    weight: 400,
    subset: "emoji",
    file: "XeetPreviewEmoji.ttf",
    ranges: [[0, 0x10ffff]],
  },
  ...[400, 700].map((weight) => ({
    kind: "fallback",
    family: "Hiragino Sans",
    weight,
    subset: "cjk",
    file: `NotoSansCJKjp-${weight === 400 ? "Regular" : "Bold"}.otf`,
    ranges: [
      [0x2e80, 0x9fff],
      [0xac00, 0xd7af],
      [0xf900, 0xfaff],
      [0xff00, 0xffef],
      [0x20000, 0x3ffff],
    ],
  })),
];
execFileSync(
  process.env.FONTTOOLS_PYTHON ||
    join(work, "font-tools", process.platform === "win32" ? "Scripts/python.exe" : "bin/python"),
  [
    join(root, "scripts/convert-emoji.py"),
    join(vendor, "fonts/NotoColorEmoji.ttf"),
    join(vendor, "fonts/XeetPreviewEmoji.ttf"),
  ],
  { stdio: "inherit" },
);
const faces = [...primary, ...extra.slice(0, 1), ...openFaces, ...extra.slice(1)];
writeFileSync(join(vendor, "fonts/manifest.json"), JSON.stringify(faces, null, 2));
for (const file of ["icons.json", "tokens.json"]) cpSync(join(upstream, "assets/vendor", file), join(vendor, file));
// Deliberately omit X's default-avatar.png; Xeet draws its built-in placeholder.
cpSync(join(upstream, "LICENSE"), join(licenses, "Xeet-Apache-2.0.txt"));

const fontInventory = [...new Set(faces.map((face) => face.file))].map((file) => ({
  file,
  sha256: createHash("sha256")
    .update(readFileSync(join(vendor, "fonts", file)))
    .digest("hex"),
}));
const inventoryPath = join(root, "scripts", "font-lock.json");
if (existsSync(inventoryPath)) {
  const expected = JSON.parse(readFileSync(inventoryPath, "utf8"));
  if (JSON.stringify(expected) !== JSON.stringify(fontInventory))
    throw new Error("Font bytes differ from font-lock.json");
} else writeFileSync(inventoryPath, JSON.stringify(fontInventory, null, 2) + "\n");

const toolchain = execFileSync("rustup", ["which", "--toolchain", "stable", "cargo"], { encoding: "utf8" }).trim();
const env = {
  ...process.env,
  PATH: `${dirname(toolchain)}${delimiter}${process.env.PATH}`,
  XEET_VENDOR_DIR: vendor,
  XEET_FONT_PACKS: "all",
  CARGO_PROFILE_RELEASE_LTO: "thin",
  CARGO_PROFILE_RELEASE_STRIP: "false",
  CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_RUSTFLAGS: "-C target-feature=+simd128",
};
execFileSync(
  toolchain,
  [
    "build",
    "--locked",
    "-p",
    "xeet-wasm",
    "--target",
    "wasm32-unknown-unknown",
    "--release",
    "--target-dir",
    join(work, "target"),
  ],
  { cwd: upstream, env, stdio: "inherit" },
);
collectRustNotices(toolchain, upstream, licenses, env);
const bindgen =
  process.env.WASM_BINDGEN ||
  join(work, "toolchain/bin", process.platform === "win32" ? "wasm-bindgen.exe" : "wasm-bindgen");
if (execFileSync(bindgen, ["--version"], { encoding: "utf8" }).trim() !== "wasm-bindgen 0.2.130")
  throw new Error("Install wasm-bindgen-cli 0.2.130");
execFileSync(
  bindgen,
  [
    "--target",
    "nodejs",
    "--out-dir",
    output,
    "--out-name",
    "xeet_wasm",
    join(work, "target/wasm32-unknown-unknown/release/xeet_wasm.wasm"),
  ],
  { stdio: "inherit" },
);
writeFileSync(join(output, "package.json"), '{ "type": "commonjs" }\n');
writeFileSync(
  join(output, "provenance.json"),
  JSON.stringify(
    {
      upstreamRevision,
      fontMode: "open-fonts",
      fonts: fontInventory,
      sources: sources.map(([repo, revision, path]) => ({ repo, revision, path })),
      wasmSha256: createHash("sha256")
        .update(readFileSync(join(output, "xeet_wasm_bg.wasm")))
        .digest("hex"),
    },
    null,
    2,
  ) + "\n",
);
console.log("Built Xeet with Noto and STIX fonts; no upstream proprietary font assets were copied.");
