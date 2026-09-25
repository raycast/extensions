#!/usr/bin/env node
/**
 * Derives the cache key suffix from the SHAPE of the cached payload.
 *
 * Three times in one release a field was added to `DiggerResult` without bumping
 * `CACHE.KEY_PREFIX`, and each time the same defect followed: an entry cached
 * under the old shape has no such field, the section renders the missing field
 * as an established absence — "None published", "No theme declared", a token
 * with no colour — and serves that for the full 48h TTL. Every instance passed
 * tsc, ray build and ray lint, because a missing optional field is valid.
 *
 * A checklist item does not fix this; remembering IS the failure. So the version
 * is computed: any change to the cached types produces a new hash, a new key
 * prefix, and automatic invalidation of every entry written under the old shape.
 *
 *   node scripts/cache-schema.mjs           regenerate src/utils/cacheSchema.ts
 *   node scripts/cache-schema.mjs --check   fail if it is out of date (CI / lint)
 *
 * WHAT THIS DOES NOT COVER — read before trusting it:
 *
 *  - **Semantic changes with an unchanged shape.** Correcting a classifier to
 *    emit "unavailable" where it used to emit "absent" does not touch a type, so
 *    the hash does not move and cached wrong values survive their TTL. Bump
 *    `CACHE_SALT` in `src/utils/config.ts` by hand for those; it is a deliberate
 *    human step for a case no type can detect.
 *  - **`ray build` / `ray lint` run directly.** npm lifecycle hooks fire for
 *    `npm run build` and `npm run lint`, not for `npx ray build`, which is what
 *    Store CI runs. CI compiles whatever `cacheSchema.ts` was committed, so the
 *    gate that matters is `npm run lint` before committing.
 *  - **`ray develop` hot reloads.** `predev` runs once at startup; adding a field
 *    mid-session rebuilds under the old hash. Restart `npm run dev` after
 *    editing a cached type.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = join(root, "src/types/index.ts");
const TARGET = join(root, "src/utils/cacheSchema.ts");

/**
 * Strips comments WITHOUT touching string literals.
 *
 * A naive regex cannot do this. `type Url = "https://x"` contains `//`, so a
 * regex-based stripper truncates it to `"https:` — and then two different URLs
 * hash identically, which is the precise failure this file exists to prevent.
 * Template literals and character classes in regex literals have the same hazard.
 */
function stripComments(source) {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < source.length) {
        if (source[i] === "\\") {
          out += source[i] + (source[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += source[i];
        if (source[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    if (c === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      // A comment separates tokens, so it must leave one space behind. Without
      // this, `string/* note */;` and `string /* note */;` hash differently and
      // reformatting alone would evict every user's cache.
      out += " ";
      continue;
    }

    out += c;
    i++;
  }
  return out;
}

/** Comments gone, whitespace collapsed — only the shape remains. */
function normalize(source) {
  return stripComments(source).replace(/\s+/g, " ").trim();
}

/**
 * Every file the cached types are built from, not just the entry point.
 *
 * `DiggerResult` reaches `WellKnownStatus`, which lives in `wellKnownCatalog.ts`.
 * Hashing only `types/index.ts` would let a rename there — `"permanent"` to
 * `"registered"`, say — keep the old key, and a cached `"permanent"` would then
 * miss the new lookup table and throw at render.
 */
function transitiveSources(entry) {
  const seen = new Set();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, "utf8");
    for (const [, specifier] of stripComments(source).matchAll(/from\s*["']([^"']+)["']/g)) {
      if (!specifier.startsWith(".")) continue; // a package, not our shape
      const base = resolve(dirname(file), specifier);
      const candidate = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")].find(existsSync);
      if (candidate) queue.push(candidate);
    }
  }
  return [...seen].sort();
}

const files = transitiveSources(ENTRY);
const digest = createHash("sha256");
for (const file of files) {
  // The path is hashed too, so moving a type between files changes the key.
  digest.update(relative(root, file));
  digest.update("\0");
  digest.update(normalize(readFileSync(file, "utf8")));
  digest.update("\0");
}
const hash = digest.digest("hex").slice(0, 10);

const contents = `// GENERATED by scripts/cache-schema.mjs — do not edit.
//
// A fingerprint of the cached payload's types and every file they are built
// from, used as the cache key version. It changes whenever the cached shape
// does, which is what makes a forgotten version bump impossible rather than
// merely discouraged. Regenerate with \`npm run cache-schema\`; \`npm run lint\`
// fails when it is stale.
//
// It does NOT change for a semantic correction that leaves the types alone —
// bump CACHE_SALT in config.ts for those. See the header of the generator.
//
// Sources:
${files.map((f) => `//   ${relative(root, f)}`).join("\n")}
export const CACHE_SCHEMA = "${hash}";
`;

const current = existsSync(TARGET) ? readFileSync(TARGET, "utf8") : null;

if (process.argv.includes("--check")) {
  if (current !== contents) {
    const was = /CACHE_SCHEMA = "([^"]+)"/.exec(current ?? "")?.[1] ?? "(missing)";
    console.error(
      `cache-schema: src/utils/cacheSchema.ts is stale.\n` +
        `  The cached types hash to ${hash}; the checked-in file says ${was}.\n` +
        `  Run: npm run cache-schema`,
    );
    process.exit(1);
  }
  console.log(`cache-schema: up to date (${hash}, ${files.length} source files)`);
} else if (current !== contents) {
  writeFileSync(TARGET, contents);
  console.log(`cache-schema: updated to ${hash} — cached entries under the old shape will be purged`);
} else {
  console.log(`cache-schema: unchanged (${hash}, ${files.length} source files)`);
}
