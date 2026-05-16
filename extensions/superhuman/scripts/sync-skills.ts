#!/usr/bin/env tsx
/**
 * Sync skills/<name>/SKILL.md from upstream
 * https://github.com/superhuman/mcp-mail/tree/main/skills.
 *
 * For each local skill, read the `upstream` URL declared in frontmatter,
 * fetch its current content, diff against the local file, and:
 *   - If unchanged, update `upstream_sha` in frontmatter to the latest
 *     remote SHA and re-write the file (a no-op when SHA already matches).
 *   - If drifted, print the diff to stderr and exit non-zero so CI can
 *     surface the divergence.
 *
 * The script is intentionally conservative: it never overwrites local
 * content automatically — content drift goes through human review in the
 * weekly sync PR.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const SKILLS_DIR = join(ROOT, "skills");

interface Frontmatter {
  upstream?: string;
  upstream_sha?: string;
  [key: string]: unknown;
}

function parseFrontmatter(raw: string): { fm: Frontmatter; rest: string; yaml: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("Missing frontmatter.");
  const [, yaml, rest] = match;
  const fm: Frontmatter = {};
  for (const line of yaml.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    fm[key] = value.trim().replace(/^["']|["']$/g, "");
  }
  return { fm, rest, yaml };
}

function replaceFrontmatterKey(raw: string, key: string, value: string): string {
  const re = new RegExp(`^(${key}:\\s*).*$`, "m");
  if (re.test(raw)) return raw.replace(re, `$1${JSON.stringify(value).replace(/^"|"$/g, '"')}`);
  // Insert before the closing ---
  return raw.replace(/^---\n([\s\S]*?)\n---/, (_m, body) => `---\n${body}\n${key}: "${value}"\n---`);
}

async function fetchUpstream(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`! ${url} → ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`! ${url} → ${(err as Error).message}`);
    return null;
  }
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 12);
}

function unifiedDiff(a: string, b: string, label: string): string {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const max = Math.max(aLines.length, bLines.length);
  const out: string[] = [`--- local/${label}`, `+++ upstream/${label}`];
  for (let i = 0; i < max; i++) {
    if (aLines[i] === bLines[i]) continue;
    if (aLines[i] !== undefined) out.push(`- ${aLines[i]}`);
    if (bLines[i] !== undefined) out.push(`+ ${bLines[i]}`);
  }
  return out.join("\n");
}

async function syncOne(name: string): Promise<{ drifted: boolean; updated: boolean }> {
  const path = join(SKILLS_DIR, name, "SKILL.md");
  const raw = readFileSync(path, "utf8");
  const { fm } = parseFrontmatter(raw);
  if (!fm.upstream) {
    console.log(`= ${name}: no upstream declared`);
    return { drifted: false, updated: false };
  }
  const remote = await fetchUpstream(String(fm.upstream));
  if (remote === null) return { drifted: false, updated: false };

  // Compare body-only — upstream may also have its own frontmatter we don't
  // want to overwrite locally.
  const local = parseFrontmatter(raw).rest.trim();
  const remoteBody = (() => {
    try {
      return parseFrontmatter(remote).rest.trim();
    } catch {
      return remote.trim();
    }
  })();

  const remoteSha = sha256(remoteBody);
  if (local === remoteBody) {
    if (fm.upstream_sha !== remoteSha) {
      writeFileSync(path, replaceFrontmatterKey(raw, "upstream_sha", remoteSha));
      console.log(`✓ ${name}: in sync, updated SHA → ${remoteSha}`);
      return { drifted: false, updated: true };
    }
    console.log(`= ${name}: in sync`);
    return { drifted: false, updated: false };
  }

  console.error(`✗ ${name}: drift detected`);
  console.error(unifiedDiff(local, remoteBody, name));
  return { drifted: true, updated: false };
}

async function main() {
  const names = readdirSync(SKILLS_DIR).filter((entry) => {
    try {
      return statSync(join(SKILLS_DIR, entry)).isDirectory();
    } catch {
      return false;
    }
  });

  let drifted = 0;
  let updated = 0;
  for (const name of names.sort()) {
    const path = join(SKILLS_DIR, name, "SKILL.md");
    try {
      statSync(path);
    } catch {
      continue;
    }
    const result = await syncOne(name);
    if (result.drifted) drifted++;
    if (result.updated) updated++;
  }

  console.log(`\nSummary: ${updated} updated, ${drifted} drifted, ${names.length} total.`);
  if (drifted > 0) {
    console.error("\nUpstream skills have diverged from the local copies.");
    console.error("Review the diffs above and either:");
    console.error("  - Adopt upstream by overwriting the local file (then commit)");
    console.error("  - Update the upstream URL in frontmatter if the upstream layout changed");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
