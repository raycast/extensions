// Automated feature tests for the QR Code Generator extension.
// Exercises the REAL source (src/config.ts, src/url.ts) plus actual QR rendering/decoding.
// Run with:  npm run test:features
// (installs sharp + jsqr ephemerally; qrcode is already a dependency)
import QRCode from "qrcode";
import sharp from "sharp";
import jsQR from "jsqr";
import {
  isValidHexColor,
  normalizeHexColor,
  relativeLuminance,
  isLowContrast,
  buildQrOptions,
  buildSvgOptions,
  COLOR_PRESETS,
  DEFAULT_COLOR,
} from "../src/config.ts";
import { isHttpUrl, appendUtmParams, shortenUrl } from "../src/url.ts";

let passed = 0;
let failed = 0;
const fails = [];
function check(name, cond) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    fails.push(name);
    console.log(`  ✗ ${name}`);
  }
}
async function checkThrows(name, fn) {
  try {
    await fn();
    check(name + " (should throw)", false);
  } catch {
    check(name, true);
  }
}
const approx = (a, b, tol = 5) => Math.abs(a - b) <= tol;

// Render a QR and return the dominant non-white module color as "#rrggbb".
async function renderedColor(format, color) {
  let buf;
  if (format === "svg") {
    const svg = await QRCode.toString("https://example.com", {
      type: "svg",
      width: 400,
      ...buildSvgOptions({ color }),
    });
    buf = Buffer.from(svg);
  } else {
    buf = await QRCode.toBuffer("https://example.com", buildQrOptions({ color, preview: true }));
  }
  const { data, info } = await sharp(buf)
    .flatten({ background: "#FFFFFF" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const counts = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  // Most common color that isn't near-white.
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.find(([k]) => !(((k >> 16) & 255) > 245 && ((k >> 8) & 255) > 245 && (k & 255) > 245));
  const r = (top[0] >> 16) & 255,
    g = (top[0] >> 8) & 255,
    b = top[0] & 255;
  return { r, g, b };
}

// Decode the text encoded in a rendered PNG QR.
async function decode(url) {
  const pngBuf = await QRCode.toBuffer(url, buildQrOptions({ color: DEFAULT_COLOR, preview: true }));
  const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return code?.data;
}

console.log("\n# Phase 1 — baseline & validation logic");
check("isValidHexColor rejects empty", !isValidHexColor(""));
check("isValidHexColor rejects undefined", !isValidHexColor(undefined));
check(
  "buildQrOptions default is black transparent",
  buildQrOptions().color.dark === "#000000" && buildQrOptions().color.light === "#00000000",
);
check("buildQrOptions preview uses white bg", buildQrOptions({ preview: true }).color.light === "#FFFFFF");
check(
  "buildSvgOptions keeps width 1536 + transparent",
  buildSvgOptions().width === 1536 && buildSvgOptions().color.light === "none",
);
{
  const black = await renderedColor("png", DEFAULT_COLOR);
  check("default PNG QR renders black", approx(black.r, 0) && approx(black.g, 0) && approx(black.b, 0));
}

console.log("\n# Phase 2 — color (presets, custom hex with/without #, 3-digit), PNG + SVG");
check("isValidHexColor accepts #1D8348", isValidHexColor("#1D8348"));
check("isValidHexColor accepts 1D8348 (no #)", isValidHexColor("1D8348"));
check("isValidHexColor accepts 3-digit f00", isValidHexColor("f00"));
check("isValidHexColor rejects xyz", !isValidHexColor("xyz"));
check("normalizeHexColor adds #", normalizeHexColor("1D8348") === "#1D8348");
check("normalizeHexColor expands 3-digit", normalizeHexColor("f00") === "#ff0000");
for (const preset of COLOR_PRESETS) {
  const want = normalizeHexColor(preset.value);
  const wr = parseInt(want.slice(1, 3), 16),
    wg = parseInt(want.slice(3, 5), 16),
    wb = parseInt(want.slice(5, 7), 16);
  const png = await renderedColor("png", preset.value);
  const svg = await renderedColor("svg", preset.value);
  check(`PNG renders ${preset.title} (${want})`, approx(png.r, wr) && approx(png.g, wg) && approx(png.b, wb));
  check(`SVG renders ${preset.title} (${want})`, approx(svg.r, wr) && approx(svg.g, wg) && approx(svg.b, wb));
}
// The two bugs you found: custom hex without #, applied to SVG export.
{
  const svg = await renderedColor("svg", "1D8348"); // no leading #
  check(
    "SVG honors custom hex WITHOUT # (regression #3)",
    approx(svg.r, 0x1d) && approx(svg.g, 0x83) && approx(svg.b, 0x48),
  );
  const png = await renderedColor("png", "f00"); // 3-digit
  check("PNG honors 3-digit hex", approx(png.r, 255) && approx(png.g, 0) && approx(png.b, 0));
}

console.log("\n# Phase 3 — low-contrast warning calibration");
check("relativeLuminance(white) ≈ 1.0 (coefficient fix)", approx(relativeLuminance("#FFFFFF") * 1000, 1000, 2));
check("black is NOT low contrast", !isLowContrast("#000000"));
check("yellow IS low contrast", isLowContrast("#FFFF00"));
check("white IS low contrast", isLowContrast("#FFFFFF"));
check("blue preset NOT low contrast", !isLowContrast("#0A66C2"));
check("no warning for invalid hex", !isLowContrast("nope"));

console.log("\n# Phase 4 — default color preference resolution");
check("valid pref color used", isValidHexColor("0A66C2") ? normalizeHexColor("0A66C2") === "#0A66C2" : false);
check("invalid pref would fall back to DEFAULT", !isValidHexColor("zzz") && DEFAULT_COLOR === "#000000");

console.log("\n# Phase 5 — shortener (mocked network; live is.gd is blocked in this container)");
const realFetch = globalThis.fetch;
globalThis.fetch = async () => ({ ok: true, text: async () => "https://is.gd/abc123\n" });
check(
  "shortenUrl returns short link on success",
  (await shortenUrl("https://example.com/very/long")) === "https://is.gd/abc123",
);
globalThis.fetch = async () => ({ ok: true, text: async () => "Error: malformed url" });
await checkThrows("shortenUrl throws on is.gd 'Error:' body", () => shortenUrl("https://x.com"));
globalThis.fetch = async () => ({ ok: false, status: 503, text: async () => "" });
await checkThrows("shortenUrl throws on non-200", () => shortenUrl("https://x.com"));
globalThis.fetch = async () => ({ ok: true, text: async () => "not-a-url" });
await checkThrows("shortenUrl throws on unexpected body", () => shortenUrl("https://x.com"));
globalThis.fetch = async () => {
  throw new DOMException("aborted", "AbortError");
};
await checkThrows("shortenUrl throws on timeout/abort", () => shortenUrl("https://x.com"));
globalThis.fetch = realFetch;

console.log("\n# Phase 6 — UTM params (built + actually encoded in the QR)");
check("isHttpUrl true for https", isHttpUrl("https://example.com"));
check("isHttpUrl false for plain text", !isHttpUrl("hello world"));
check(
  "appendUtmParams adds params",
  appendUtmParams("https://example.com", { source: "news", medium: "email" }) ===
    "https://example.com/?utm_source=news&utm_medium=email",
);
check(
  "appendUtmParams preserves existing query",
  appendUtmParams("https://example.com/?a=1", { source: "s" }).includes("a=1") &&
    appendUtmParams("https://example.com/?a=1", { source: "s" }).includes("utm_source=s"),
);
check(
  "appendUtmParams skips empty fields",
  !appendUtmParams("https://example.com", { source: "s", medium: "  " }).includes("utm_medium"),
);
check("appendUtmParams leaves plain text unchanged", appendUtmParams("just text", { source: "s" }) === "just text");
{
  const withUtm = appendUtmParams("https://example.com/p", {
    source: "newsletter",
    medium: "email",
    campaign: "spring",
  });
  const decoded = await decode(withUtm);
  check("QR actually encodes the UTM'd URL", decoded === withUtm);
}

console.log("\n# Phase 7 — combined pipeline (UTM → shorten → encode)");
{
  globalThis.fetch = async () => ({ ok: true, text: async () => "https://is.gd/short9" });
  const utmd = appendUtmParams("https://example.com/very/long/path", { source: "s", medium: "m" });
  const finalUrl = await shortenUrl(utmd); // UTM applied before shortening, as in prepareUrl
  globalThis.fetch = realFetch;
  check("pipeline shortens the UTM'd URL", finalUrl === "https://is.gd/short9");
  const decoded = await decode(finalUrl);
  check("combined QR encodes the short link", decoded === "https://is.gd/short9");
  // color + format + content together
  const svg = await renderedColor("svg", "#C0392B");
  check("combined: SVG renders chosen color", approx(svg.r, 0xc0) && approx(svg.g, 0x39) && approx(svg.b, 0x2b));
}

console.log(`\n${"=".repeat(48)}`);
console.log(`RESULT: ${passed} passed, ${failed} failed`);
if (failed) {
  console.log("FAILED:\n - " + fails.join("\n - "));
  process.exit(1);
}
console.log("All automated checks passed ✅");
