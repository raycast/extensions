/**
 * Lightweight self-test: no test framework, just run it with node.
 * Usage: npx tsx src/__tests__/toolbox.test.ts   or   npm test
 */
import assert from "assert";
import {
  analyzeCidr,
  base64Decode,
  base64Encode,
  binaryDecode,
  binaryEncode,
  buildQueryString,
  convertCase,
  convertRadix,
  crc32,
  decodeJwt,
  describeJson,
  diffLines,
  diffStats,
  formatTimestamp,
  generatePassword,
  hashAll,
  hexDecode,
  hexEncode,
  humanizeRelative,
  ipToBinary,
  ipToLong,
  isPrivateIp,
  jsonToTypeScript,
  longToIp,
  nextCronRuns,
  parseColor,
  parseCron,
  parseDateFlexible,
  parseQueryString,
  passwordStrength,
  previewMultiline,
  previewTitle,
  clampDetail,
  textMeta,
  weekStart,
  radixTable,
  rgbToHex,
  rgbToHsl,
  sortJsonKeys,
  textStats,
  urlDecode,
  urlEncode,
  uuidV4,
  uuidV7,
} from "../utils/toolbox";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    throw error;
  }
}

console.log("toolbox self-test");

test("parseDateFlexible parses second and millisecond timestamps", () => {
  assert.strictEqual(parseDateFlexible("1700000000")?.getTime(), 1700000000000);
  assert.strictEqual(parseDateFlexible("1700000000000")?.getTime(), 1700000000000);
});

test("parseDateFlexible parses common date strings", () => {
  const d = parseDateFlexible("2024-01-02 03:04:05");
  assert.strictEqual(d?.getFullYear(), 2024);
  assert.strictEqual(d?.getMonth(), 0);
  assert.strictEqual(d?.getDate(), 2);
  assert.strictEqual(d?.getHours(), 3);
});

test("parseDateFlexible returns null for invalid input", () => {
  assert.strictEqual(parseDateFlexible("not-a-date"), null);
});

test("formatTimestamp emits the key fields", () => {
  const f = formatTimestamp(new Date(1700000000000));
  assert.strictEqual(f.seconds, 1700000000);
  assert.strictEqual(f.milliseconds, 1700000000000);
  assert.ok(f.iso.startsWith("2023-11-14"));
  assert.strictEqual(f.timezone.length, 9);
});

test("humanizeRelative describes the past and the future", () => {
  const now = new Date("2024-01-02T00:00:00Z");
  assert.strictEqual(humanizeRelative(new Date("2024-01-01T21:00:00Z"), now), "3 hours ago");
  assert.strictEqual(humanizeRelative(new Date("2024-01-02T02:00:00Z"), now), "in 2 hours");
});

test("urlEncode / urlDecode round-trip", () => {
  const input = "a b&c=d/中文?";
  assert.strictEqual(urlDecode(urlEncode(input)), input);
  assert.strictEqual(urlEncode("a b"), "a%20b");
  assert.strictEqual(urlEncode("https://a.com/b c", "uri" as never), "https://a.com/b%20c");
});

test("urlDecode does not throw on malformed escapes", () => {
  assert.strictEqual(urlDecode("%E4%B8"), "%E4%B8");
});

test("parseQueryString / buildQueryString", () => {
  const pairs = parseQueryString("https://a.com/?q=hello+world&page=1#hash");
  assert.deepStrictEqual(pairs, [
    { key: "q", value: "hello world" },
    { key: "page", value: "1" },
  ]);
  assert.strictEqual(buildQueryString(pairs), "q=hello%20world&page=1");
});

test("base64 encode/decode, including URL Safe", () => {
  assert.strictEqual(base64Encode("hello world"), "aGVsbG8gd29ybGQ=");
  assert.strictEqual(base64Decode("aGVsbG8gd29ybGQ="), "hello world");
  assert.strictEqual(base64Encode("中"), "5Lit");
  // URL Safe replaces the + and / of standard base64 with - and _, and drops the padding
  // "ÿÿ" is w7/Dvw== in standard base64 and w7_Dvw when URL Safe
  assert.strictEqual(base64Encode("\u00ff\u00ff"), "w7/Dvw==");
  assert.strictEqual(base64Encode("\u00ff\u00ff", true), "w7_Dvw");
  // "??>" is Pz8+ in standard base64 and Pz8- when URL Safe
  assert.strictEqual(base64Encode("??>", true), "Pz8-");
  assert.strictEqual(base64Decode("w7_Dvw"), "\u00ff\u00ff");
});

test("hex / binary encode/decode", () => {
  assert.strictEqual(hexDecode(hexEncode("hi")), "hi");
  assert.strictEqual(binaryDecode(binaryEncode("hi")), "hi");
});

test("hashAll matches known digests", () => {
  const hashes = hashAll("hello world");
  assert.strictEqual(hashes.md5, "5eb63bbbe01eeed093cb22bb8f5acdc3");
  assert.strictEqual(hashes.sha256, "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
});

test("crc32 is correct", () => {
  assert.strictEqual(crc32("The quick brown fox jumps over the lazy dog"), "414fa339");
});

test("uuid v4 / v7 format and version bits", () => {
  const v4 = uuidV4();
  assert.match(v4, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const v7 = uuidV7(1700000000000);
  assert.match(v7, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("convertRadix converts between bases", () => {
  assert.strictEqual(convertRadix("255", 10, 16), "ff");
  assert.strictEqual(convertRadix("ff", 16, 2), "11111111");
  assert.strictEqual(convertRadix("0b1010", 2, 10), "10");
  assert.strictEqual(convertRadix("-10", 10, 2), "-1010");
  assert.strictEqual(radixTable("ff", 16)[0].value, "11111111");
});

test("convertRadix throws on an invalid digit", () => {
  assert.throws(() => convertRadix("2", 2, 10));
});

test("sortJsonKeys sorts recursively", () => {
  const out = sortJsonKeys('{"b":1,"a":{"d":2,"c":3}}');
  assert.strictEqual(out.indexOf('"a"') < out.indexOf('"b"'), true);
});

test("describeJson builds a structural summary", () => {
  assert.strictEqual(describeJson('{"id":1,"tags":["a"]}'), "{ id: number, tags: Array<string> }");
});

test("jsonToTypeScript emits interfaces", () => {
  const ts = jsonToTypeScript('{"user":{"id":1,"name":"a"}}');
  assert.ok(ts.includes("export interface User"));
  assert.ok(ts.includes("id: number;"));
});

test("decodeJwt reads header/payload and flags expiry", () => {
  // {"alg":"HS256","typ":"JWT"} . {"sub":"1","exp":1700000000} . sig
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzAwMDAwMDAwfQ.sig";
  const jwt = decodeJwt(token);
  assert.deepStrictEqual(jwt.header, { alg: "HS256", typ: "JWT" });
  assert.strictEqual(jwt.payload.sub, "1");
  assert.strictEqual(jwt.expired, true);
});

test("decodeJwt throws on an invalid token", () => {
  assert.throws(() => decodeJwt("abc"));
});

test("IP and integer conversions", () => {
  assert.strictEqual(ipToLong("192.168.1.1"), 3232235777);
  assert.strictEqual(longToIp(3232235777), "192.168.1.1");
  assert.strictEqual(ipToBinary("1.2.3.4"), "00000001.00000010.00000011.00000100");
});

test("isPrivateIp detects private ranges", () => {
  assert.strictEqual(isPrivateIp("10.1.2.3"), true);
  assert.strictEqual(isPrivateIp("192.168.0.1"), true);
  assert.strictEqual(isPrivateIp("8.8.8.8"), false);
});

test("analyzeCidr computes subnet details", () => {
  const info = analyzeCidr("192.168.1.10/24");
  assert.strictEqual(info.network, "192.168.1.0/24");
  assert.strictEqual(info.broadcast, "192.168.1.255");
  assert.strictEqual(info.netmask, "255.255.255.0");
  assert.strictEqual(info.firstHost, "192.168.1.1");
  assert.strictEqual(info.lastHost, "192.168.1.254");
  assert.strictEqual(info.usableHosts, 254);
});

test("parseCron parses the fields", () => {
  const fields = parseCron("*/15 9-17 * * 1-5");
  assert.deepStrictEqual(fields[0], [0, 15, 30, 45]);
  assert.deepStrictEqual(fields[1], [9, 10, 11, 12, 13, 14, 15, 16, 17]);
  assert.deepStrictEqual(fields[4], [1, 2, 3, 4, 5]);
});

test("nextCronRuns predicts the next runs", () => {
  const runs = nextCronRuns("0 0 * * *", 3, new Date("2024-01-01T10:00:00Z"));
  assert.strictEqual(runs.length, 3);
  assert.strictEqual(runs[0].getDate(), 2);
  assert.strictEqual(runs[0].getHours(), 0);
});

test("diffLines marks added and removed lines", () => {
  const lines = diffLines("a\nb\nc", "a\nx\nc");
  const stats = diffStats(lines);
  assert.strictEqual(stats.added, 1);
  assert.strictEqual(stats.removed, 1);
  assert.strictEqual(stats.unchanged, 2);
});

test("diffLines supports ignoring case and whitespace", () => {
  const stats = diffStats(diffLines("Hello World", "hello   world", true, true));
  assert.strictEqual(stats.unchanged, 1);
});

test("generatePassword honours the configuration", () => {
  const pwd = generatePassword({
    length: 16,
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: true,
  });
  assert.strictEqual(pwd.length, 16);
  assert.match(pwd, /[a-z]/);
  assert.match(pwd, /[A-Z]/);
  assert.match(pwd, /[0-9]/);
  assert.match(pwd, /[^a-zA-Z0-9]/);
  assert.strictEqual(/[Il1O0o]/.test(pwd), false);
});

test("generatePassword throws when no character set is selected", () => {
  assert.throws(() =>
    generatePassword({
      length: 8,
      lowercase: false,
      uppercase: false,
      digits: false,
      symbols: false,
      excludeAmbiguous: false,
    }),
  );
});

test("passwordStrength scores longer passwords higher", () => {
  assert.ok(passwordStrength("aB3!aB3!aB3!aB3!aB3!").entropy > passwordStrength("abc123").entropy);
});

test("convertCase covers the naming styles", () => {
  assert.strictEqual(convertCase("user profile URL", "camel"), "userProfileUrl");
  assert.strictEqual(convertCase("user_profile_url", "pascal"), "UserProfileUrl");
  assert.strictEqual(convertCase("userProfileUrl", "snake"), "user_profile_url");
  assert.strictEqual(convertCase("userProfileUrl", "screamingSnake"), "USER_PROFILE_URL");
  assert.strictEqual(convertCase("userProfileUrl", "kebab"), "user-profile-url");
  assert.strictEqual(convertCase("user_profile_url", "dot"), "user.profile.url");
  assert.strictEqual(convertCase("user_profile_url", "title"), "User Profile Url");
});

test("color conversions round-trip", () => {
  const rgb = { r: 59, g: 130, b: 246 };
  assert.strictEqual(rgbToHex(rgb), "#3b82f6");
  assert.deepStrictEqual(parseColor("#3b82f6"), rgb);
  assert.deepStrictEqual(parseColor("rgb(59, 130, 246)"), rgb);
  // HSL goes through rounding, so allow a tolerance of ±2
  const fromHsl = parseColor("hsl(217, 91%, 60%)");
  assert.ok(Math.abs(fromHsl.r - rgb.r) <= 2 && Math.abs(fromHsl.g - rgb.g) <= 2 && fromHsl.b === rgb.b);
  const hsl = rgbToHsl(rgb);
  assert.strictEqual(hsl.h, 217);
});

test("parseColor rejects invalid input", () => {
  assert.throws(() => parseColor("not-a-color"));
});

test("textStats counts correctly", () => {
  const stats = textStats("hello 世界\n\nfoo bar");
  assert.strictEqual(stats.lines, 3);
  assert.strictEqual(stats.nonEmptyLines, 2);
  assert.strictEqual(stats.cjk, 2);
});

test("previewTitle folds long text and reports how much was hidden", () => {
  const long = "a".repeat(300);
  const preview = previewTitle(long, 100);
  assert.ok(preview.startsWith("a".repeat(100)));
  assert.ok(preview.includes("(+200 chars hidden)"));
  assert.strictEqual(previewTitle("  hello   world "), "hello world");
});

test("previewMultiline limits lines and characters", () => {
  const text = Array.from({ length: 20 }, (_, i) => `line-${i}`).join("\n");
  const preview = previewMultiline(text, 220, 6);
  assert.strictEqual(preview.split("\n").length, 6);
  assert.ok(preview.endsWith("…"));
  const wide = previewMultiline("x".repeat(500), 220, 6);
  assert.strictEqual(wide.length, 221);
});

test("clampDetail truncates oversized content", () => {
  const short = clampDetail("abc", 10);
  assert.deepStrictEqual(short, { text: "abc", truncated: false });
  const long = clampDetail("abcdefghij", 4);
  assert.deepStrictEqual(long, { text: "abcd", truncated: true });
});

test("textMeta counts characters / lines / longest line / bytes", () => {
  const meta = textMeta("hello\nworld!!");
  assert.strictEqual(meta.chars, 13);
  assert.strictEqual(meta.lines, 2);
  assert.strictEqual(meta.longestLine, 7);
  assert.strictEqual(meta.bytes, 13);
  assert.deepStrictEqual(textMeta(""), { chars: 0, lines: 0, longestLine: 0, bytes: 0 });
});

test("weekStart returns Monday 00:00 of the same week", () => {
  // 2026-01-01 is a Thursday
  const start = weekStart(new Date(2026, 0, 1, 15, 30, 0));
  assert.strictEqual(start.getDay(), 1);
  assert.strictEqual(start.getDate(), 29);
  assert.strictEqual(start.getHours(), 0);
  // Sunday belongs to the week that started the previous Monday
  const sunday = weekStart(new Date(2026, 0, 4, 10, 0, 0));
  assert.strictEqual(sunday.getDate(), 29);
});

test("formatTimestamp is self-consistent across seconds and milliseconds", () => {
  const date = new Date(2026, 0, 1, 8, 0, 0);
  const f = formatTimestamp(date);
  assert.strictEqual(f.seconds * 1000, f.milliseconds - (f.milliseconds % 1000));
  assert.strictEqual(f.datetime, "2026-01-01 08:00:00");
  assert.strictEqual(f.date, "2026-01-01");
  assert.strictEqual(f.time, "08:00:00");
});

test("parseDateFlexible rejects dates that do not exist", () => {
  // Date would otherwise roll these forward: Feb 30 -> Mar 1, month 13 -> next January
  assert.strictEqual(parseDateFlexible("2024-02-30"), null);
  assert.strictEqual(parseDateFlexible("2024-13-01"), null);
  assert.strictEqual(parseDateFlexible("2024-00-10"), null);
  assert.strictEqual(parseDateFlexible("2023-02-29"), null);
  assert.strictEqual(parseDateFlexible("2024-06-01 25:00:00"), null);
  // the real ones still parse
  assert.strictEqual(parseDateFlexible("2024-02-29")?.getDate(), 29);
  assert.strictEqual(parseDateFlexible("2024-12-31")?.getMonth(), 11);
});

test("nextCronRuns treats day-of-month and day-of-week as alternatives", () => {
  // "0 0 1 * 1" fires on the 1st of every month AND on every Monday
  const runs = nextCronRuns("0 0 1 * 1", 12, new Date(2026, 0, 1, 0, 0, 0));
  assert.ok(
    runs.some((d) => d.getDate() === 1),
    "expected at least one first-of-month run",
  );
  assert.ok(
    runs.some((d) => d.getDay() === 1),
    "expected at least one Monday run",
  );
  assert.ok(
    runs.every((d) => d.getDate() === 1 || d.getDay() === 1),
    "every predicted run must satisfy one of the two restricted fields",
  );

  // With only one of the two restricted it is still a plain AND
  assert.ok(nextCronRuns("0 0 * * 1", 5, new Date(2026, 0, 1, 0, 0, 0)).every((d) => d.getDay() === 1));
});

test("nextCronRuns treats a stepped wildcard day field as a wildcard", () => {
  // Vixie cron sets DOM_STAR/DOW_STAR from the field's *first character*, so `*/2` counts
  // as `*` and the two day fields stay ANDed: `0 0 */2 * 1` is "Mondays on odd dates".
  const runs = nextCronRuns("0 0 */2 * 1", 6, new Date(2026, 8, 17, 0, 0, 0));
  assert.strictEqual(runs.length, 6);
  assert.ok(
    runs.every((d) => d.getDay() === 1 && d.getDate() % 2 === 1),
    `expected only odd-date Mondays, got ${runs.map((d) => `${d.toDateString()}`).join(", ")}`,
  );

  // ...while a genuinely restricted day field on either side still selects the OR path
  assert.ok(nextCronRuns("0 0 1-31/2 * 1", 6, new Date(2026, 8, 17, 0, 0, 0)).some((d) => d.getDay() !== 1));
});

test("diffLines keeps line numbers aligned across a trimmed prefix and suffix", () => {
  const lines = diffLines(["a", "b", "c", "d", "e"].join("\n"), ["a", "b", "X", "Y", "e"].join("\n"));
  assert.deepStrictEqual(
    lines.filter((l) => l.type === "same").map((l) => l.value),
    ["a", "b", "e"],
  );
  assert.strictEqual(lines[0].leftNumber, 1);
  assert.strictEqual(lines[0].rightNumber, 1);
  const last = lines[lines.length - 1];
  assert.strictEqual(last.value, "e");
  assert.strictEqual(last.leftNumber, 5);
  assert.strictEqual(last.rightNumber, 5);
});

test("diffLines stays cheap when two large files share a long prefix", () => {
  const shared = Array.from({ length: 20000 }, (_, i) => `line ${i}`);
  const lines = diffLines([...shared, "old tail"].join("\n"), [...shared, "new tail"].join("\n"));
  const stats = diffStats(lines);
  assert.strictEqual(stats.added, 1);
  assert.strictEqual(stats.removed, 1);
  assert.strictEqual(stats.unchanged, 20000);
});

test("diffLines refuses inputs whose diff table would be too large", () => {
  const a = Array.from({ length: 3000 }, (_, i) => `a${i}`).join("\n");
  const b = Array.from({ length: 3000 }, (_, i) => `b${i}`).join("\n");
  assert.throws(() => diffLines(a, b), /Too much text to diff/);
});

test("generatePassword always covers every selected character set", () => {
  const options = {
    length: 4,
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: false,
  };
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/];
  for (let i = 0; i < 300; i++) {
    const password = generatePassword(options);
    assert.strictEqual(password.length, 4);
    classes.forEach((c) => assert.ok(c.test(password), `missing a class in ${password}`));
  }
  // still holds once ambiguous characters are excluded
  const strict = { ...options, excludeAmbiguous: true };
  for (let i = 0; i < 200; i++) {
    const password = generatePassword(strict);
    classes.forEach((c) => assert.ok(c.test(password), `missing a class in ${password}`));
  }
});

test("parseColor rejects out-of-range RGB channels instead of clamping them", () => {
  assert.throws(() => parseColor("rgb(300,0,0)"), /Unrecognized color format/);
  assert.throws(() => parseColor("rgb(0,256,0)"), /Unrecognized color format/);
  const rgb = parseColor("rgb(255,128,0)");
  assert.deepStrictEqual(rgb, { r: 255, g: 128, b: 0 });
  assert.strictEqual(rgbToHex(rgb), "#ff8000");
});

console.log(`\nAll ${passed} tests passed`);
