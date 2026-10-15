/**
 * check-paths.mjs — invariant check for the generated `src/data/paths.ts`.
 *
 * `paths.ts` is generated from a browser census (see docs/paths.md), so the failures worth
 * catching are the ones generators produce: a duplicate id that silently breaks starring, a
 * browser key that matches no browser, a flag combination the UI cannot render.
 *
 * Usage:  node src/utils/check-paths.mjs
 * Exits non-zero and prints every violation if any invariant fails.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const paths = readFileSync(join(here, "../data/paths.ts"), "utf8");
const browsers = readFileSync(join(here, "../types/browsers.ts"), "utf8");
const manifest = JSON.parse(readFileSync(join(here, "../../package.json"), "utf8"));

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

// Browser keys, straight from the source of truth.
const validKeys = new Set([...browsers.matchAll(/^\s*key: "([^"]+)",$/gm)].map((m) => m[1]));
check(validKeys.size > 0, "parsed no browser keys from browsers.ts — the check itself is broken");

// Named group constants declared at the top of paths.ts.
const groups = new Map(
  [...paths.matchAll(/^const ([A-Z_]+) = \[([^\]]*)\];$/gm)].map(([, name, body]) => [
    name,
    [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]),
  ]),
);

// Split the array into per-entry blocks on the closing brace of each object literal.
const body = paths.slice(paths.indexOf("[", paths.indexOf("browserCommands")), paths.lastIndexOf("];"));
const entries = body.split(/\n\s*\},?\n/).filter((b) => b.includes("id:"));
check(entries.length > 250, `parsed only ${entries.length} entries — the check itself is broken`);

const seenIds = new Map();
const seenPaths = new Map();

for (const block of entries) {
  const id = block.match(/\bid: "([^"]+)"/)?.[1];
  const path = block.match(/\bpath: "([^"]+)"/)?.[1];
  check(id && path, `entry missing id or path: ${block.slice(0, 80)}`);
  if (!id || !path) continue;

  check(!seenIds.has(id), `duplicate id "${id}" (starring keys on id, so a clash breaks both entries)`);
  seenIds.set(id, path);
  check(!seenPaths.has(path), `duplicate path "${path}" (also on id "${seenPaths.get(path)}")`);
  seenPaths.set(path, id);

  const raw = block.match(/supportedBrowsers: (\[[^\]]*\]|[A-Z_]+)/)?.[1];
  check(raw !== undefined, `${id}: no supportedBrowsers`);
  const keys = raw?.startsWith("[") ? [...raw.matchAll(/"([^"]+)"/g)].map((m) => m[1]) : (groups.get(raw) ?? null);
  check(keys !== null, `${id}: supportedBrowsers references unknown constant ${raw}`);
  if (keys) {
    check(keys.length > 0, `${id}: empty supportedBrowsers — it can never appear`);
    for (const k of keys) check(validKeys.has(k), `${id}: unknown browser key "${k}"`);
  }

  const has = (field) => block.includes(`${field}: true`);
  const untrusted = path.startsWith("chrome-untrusted://");
  check(untrusted === has("isUntrusted"), `${id}: isUntrusted disagrees with the path scheme`);
  check(
    !(has("isDebugCommand") && has("isInternalDebugging")),
    `${id}: both isDebugCommand and isInternalDebugging — they are different sections of chrome-urls`,
  );
  check(
    has("isDeprecated") === block.includes("deprecationNote:"),
    `${id}: isDeprecated and deprecationNote must travel together`,
  );
  check(
    !(has("isDeprecated") && (block.includes("requiresFeatureFlag:") || has("notDirectlyReachable"))),
    `${id}: a removed URL cannot also be flag-gated or unreachable-but-present`,
  );
  check(
    !(block.includes("platforms:") && block.includes("excludedPlatforms:")),
    `${id}: sets both platforms and excludedPlatforms`,
  );

  // Only paths carrying their own scheme may contain "://" — everything else gets one prefixed.
  check(
    !path.includes("://") || untrusted,
    `${id}: path contains a scheme we do not special-case, so a second one would be prefixed`,
  );
}

// A macOS+Windows extension cannot reach a Linux-only entry.
const declared = new Set(manifest.platforms ?? []);
for (const [id] of seenIds) void id;
const linuxOnly = [...body.matchAll(/\bid: "([^"]+)"[\s\S]*?platforms: \["linux"\]/g)].map((m) => m[1]);
check(
  linuxOnly.length === 0 || declared.has("Linux"),
  `entries restricted to Linux are unreachable on ${[...declared].join("/")}: ${linuxOnly.join(", ")}`,
);

// Every preference the UI reads must be declared, and vice versa.
const declaredPrefs = new Set((manifest.preferences ?? []).map((p) => p.name));
const listCommands = readFileSync(join(here, "../listCommands.tsx"), "utf8");
const readPrefs = new Set([...listCommands.matchAll(/prefs\.([A-Za-z0-9_]+)/g)].map((m) => m[1]));
for (const p of readPrefs)
  check(declaredPrefs.has(p), `listCommands reads preference "${p}" that package.json does not declare`);
for (const p of declaredPrefs) check(readPrefs.has(p), `package.json declares preference "${p}" that nothing reads`);

if (failures.length) {
  console.error(`check-paths: ${failures.length} violation(s)`);
  for (const f of failures) console.error("  ✗", f);
  process.exit(1);
}
console.log(`check-paths: OK — ${seenIds.size} entries, ${validKeys.size} browsers, ${declaredPrefs.size} preferences`);
