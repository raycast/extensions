import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE_OWNER, SOURCE_REPOSITORY, SOURCE_STATE_PATH, buildManifest } from "./sync-data-lib.mjs";

const OUTPUT_PATH = fileURLToPath(new URL("../src/data/screenshots.json", import.meta.url));
const API_BASE = `https://api.github.com/repos/${SOURCE_OWNER}/${SOURCE_REPOSITORY}`;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "bang-dream-screenshot-search-data-sync",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}): ${url}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "bang-dream-screenshot-search-data-sync" } });
  if (!response.ok) throw new Error(`Source request failed (${response.status}): ${url}`);
  return response.text();
}

function requestedCommit() {
  const commitIndex = process.argv.indexOf("--commit");
  if (commitIndex === -1) return undefined;
  const commit = process.argv[commitIndex + 1];
  if (!commit) throw new Error("--commit requires a SHA");
  return commit;
}

async function resolveCommit() {
  const explicitCommit = requestedCommit();
  if (explicitCommit) return explicitCommit;
  const latestCommit = await fetchJson(`${API_BASE}/commits/main`);
  return latestCommit.sha;
}

async function main() {
  const commit = await resolveCommit();
  const [tree, sourceText] = await Promise.all([
    fetchJson(`${API_BASE}/git/trees/${commit}?recursive=1`),
    fetchText(`https://raw.githubusercontent.com/${SOURCE_OWNER}/${SOURCE_REPOSITORY}/${commit}/${SOURCE_STATE_PATH}`),
  ]);

  if (tree.truncated) throw new Error("GitHub returned a truncated repository tree");
  const treePaths = tree.tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);
  const manifest = buildManifest({ commit, sourceText, treePaths });

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Synced ${manifest.screenshots.length} screenshots from ${manifest.series.length} series at ${commit}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
