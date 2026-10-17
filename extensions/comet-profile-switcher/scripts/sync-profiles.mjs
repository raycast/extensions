#!/usr/bin/env node
// Local mode: builds a private copy of the extension in .local/ with one real command per
// Comet profile (named after the profile, with an icon in its colors). Run `npm run local`.
// The committed extension (Store version) keeps the fixed "Profile 1…5" slot commands.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".local");
const userDataDir = process.env.COMET_USER_DATA_DIR ?? join(homedir(), "Library", "Application Support", "Comet");
const localStatePath = join(userDataDir, "Local State");

const argbToHex = (n) => (typeof n === "number" ? "#" + ((n >>> 0) & 0xffffff).toString(16).padStart(6, "0") : undefined);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "profile";

function readProfiles() {
  if (!existsSync(localStatePath)) {
    console.error(`sync-profiles: no Comet "Local State" at ${localStatePath}`);
    process.exit(1);
  }
  const state = JSON.parse(readFileSync(localStatePath, "utf8"));
  const info = state.profile?.info_cache ?? {};
  const order = (state.profile?.profiles_order ?? []).filter((d) => d in info);
  const dirs = [...order, ...Object.keys(info).filter((d) => !order.includes(d))];
  return dirs.map((directory) => ({
    directory,
    name: (info[directory].name ?? "").trim() || directory,
    fill: argbToHex(info[directory].default_avatar_fill_color) ?? "#dfe3e8",
    stroke: argbToHex(info[directory].default_avatar_stroke_color) ?? "#4b5563",
  }));
}

// --- tiny PNG writer: a Chromium-style avatar disc in the profile's colors -----------------
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function avatarPng(fillHex, strokeHex, size = 512) {
  const fill = hexRgb(fillHex);
  const stroke = hexRgb(strokeHex);
  const c = size / 2;
  const R = size * 0.46;
  const ring = size * 0.035;
  const headR = size * 0.13;
  const headY = size * 0.4;
  const bodyRx = size * 0.27;
  const bodyRy = size * 0.2;
  const bodyY = size * 0.8;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const smooth = (d) => Math.max(0, Math.min(1, 0.5 - d));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const px = x + 0.5 - c;
      const py = y + 0.5;
      const dDisc = Math.hypot(px, py - c) - R;
      const disc = smooth(dDisc);
      const ringCov = smooth(dDisc) * (1 - smooth(dDisc + ring));
      const dHead = Math.hypot(px, py - headY) - headR;
      const dBody = (Math.hypot(px / bodyRx, (py - bodyY) / bodyRy) - 1) * Math.min(bodyRx, bodyRy);
      const person = Math.max(smooth(dHead), smooth(dBody)) * smooth(dDisc + ring * 0.5);
      let rgb = fill;
      const strokeCov = Math.max(ringCov, person);
      if (strokeCov > 0) rgb = rgb.map((v, i) => v + (stroke[i] - v) * strokeCov);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = rgb[0];
      raw[o + 1] = rgb[1];
      raw[o + 2] = rgb[2];
      raw[o + 3] = Math.round(disc * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- build .local/ -------------------------------------------------------------------------
const profiles = readProfiles();
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
cpSync(join(root, "src"), join(out, "src"), { recursive: true });
cpSync(join(root, "assets"), join(out, "assets"), { recursive: true });
for (const f of ["tsconfig.json", "eslint.config.mjs", ".prettierrc"]) if (existsSync(join(root, f))) cpSync(join(root, f), join(out, f));
symlinkSync(join(root, "node_modules"), join(out, "node_modules"));
// Slot commands are not needed in local mode.
for (const f of readdirSync(join(out, "src"))) if (/^slot(-\d+)?\.ts$/.test(f)) rmSync(join(out, "src", f));

const used = new Set();
const generated = profiles.map((p) => {
  let slug = slugify(p.directory);
  while (used.has(slug)) slug += "-2";
  used.add(slug);
  return { ...p, command: `profile-${slug}`, icon: `profile-${slug}.png` };
});

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
pkg.title = `${pkg.title} (Local)`;
pkg.commands = [
  ...pkg.commands.filter((c) => c.name === "switch-profile"),
  ...generated.map((p) => ({
    name: p.command,
    title: p.name,
    subtitle: "Comet Profile",
    description: `Open the “${p.name}” Comet profile.`,
    icon: p.icon,
    mode: "no-view",
    keywords: ["comet", "profile", p.directory],
    arguments: [{ name: "url", type: "text", placeholder: "URL (optional)", required: false }],
  })),
];
delete pkg.scripts;
writeFileSync(join(out, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

for (const p of generated) {
  writeFileSync(
    join(out, "src", `${p.command}.ts`),
    `import { LaunchProps } from "@raycast/api";
import { runProfileCommand } from "./launch";

export default async function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  await runProfileCommand(${JSON.stringify(p.directory)}, ${JSON.stringify(p.name)}, props.arguments.url);
}
`,
  );
  writeFileSync(join(out, "assets", p.icon), avatarPng(p.fill, p.stroke));
}

console.log(`sync-profiles: built .local/ with ${generated.length} profile command(s): ${generated.map((p) => p.name).join(", ")}`);
