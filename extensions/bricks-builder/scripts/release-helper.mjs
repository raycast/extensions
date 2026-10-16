// Publishes the helper plugin zip as the latest release on the license server
// (github.com/matejmohar/martej-license-server), so licensed sites get it as a WordPress update.
// The release workflow runs it for helper-v* tags; by hand, after bumping the version and building the zip:
//
//   node scripts/release-helper.mjs
//   node scripts/release-helper.mjs --dry-run     shows what would be uploaded
//   node scripts/release-helper.mjs --changelog-file notes.md --verify https://license.martej.com
//
// The changelog comes from --changelog-file (the GitHub Action passes the tag message), or else from
// the plugin's section in HELPER-CHANGELOG.md. --verify checks that the license server
// reports the new version afterwards. Uploading uses wrangler, so it needs `wrangler login` locally,
// or CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in CI.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
/** The license server's RELEASES KV namespace (see its wrangler.toml). */
const RELEASES_KV_ID = "5979eb066248446687290870867d4643";
const WRANGLER = "wrangler@4.151.0";
const dryRun = process.argv.includes("--dry-run");
const option = (name) => {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : undefined;
};
const changelogFile = option("--changelog-file");
const verifyUrl = option("--verify");

const plugin = readFileSync(join(ROOT, "assets/bricks-raycast-helper/bricks-raycast-helper.php"), "utf8");
const header = (name) => plugin.match(new RegExp(`^ \\* ${name}:\\s*(.+)$`, "m"))?.[1].trim();
const version = header("Version");
if (!version) throw new Error("Couldn't read the plugin version");

const ZIP_FILE = join(ROOT, "build/bricks-raycast-helper.zip");
execFileSync("node", [join(ROOT, "scripts/helper-zip.js"), ZIP_FILE], { stdio: "inherit" });

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// "- item" lines become a list; other lines become paragraphs.
function changelogHtml(lines) {
  const html = [];
  let list = [];
  const flush = () => {
    if (list.length) html.push(`<ul>${list.join("")}</ul>`);
    list = [];
  };
  for (const line of lines.map((l) => l.trim()).filter(Boolean)) {
    if (/^[-*] /.test(line)) list.push(`<li>${escape(line.slice(2))}</li>`);
    else {
      flush();
      html.push(`<p>${escape(line)}</p>`);
    }
  }
  flush();
  return html.join("");
}

let notes;
if (changelogFile) {
  notes = readFileSync(changelogFile, "utf8").split("\n");
} else {
  const changelog = readFileSync(join(ROOT, "HELPER-CHANGELOG.md"), "utf8");
  const section = changelog.split(/^## /m).find((part) => part.startsWith(`${version}`));
  if (!section) throw new Error(`Add a "## ${version}" section to HELPER-CHANGELOG.md first`);
  notes = section.split("\n").slice(1);
}

const zip = `releases/bricks-raycast-helper-${version}.zip`;
const release = {
  version,
  zip,
  requires: header("Requires at least"),
  requires_php: header("Requires PHP"),
  tested: header("Tested up to"),
  changelog: `<h4>${escape(version)}</h4>${changelogHtml(notes)}`,
  released_at: new Date().toISOString(),
};

const dir = mkdtempSync(join(tmpdir(), "bricks-release-"));
const latest = join(dir, "latest.json");
writeFileSync(latest, JSON.stringify(release, null, 2));

const put = (key, file) => {
  const args = ["-y", WRANGLER, "kv", "key", "put", key, "--namespace-id", RELEASES_KV_ID, "--path", file, "--remote"];
  console.log(`npx ${args.join(" ")}`);
  if (!dryRun) execFileSync("npx", args, { stdio: "inherit" });
};

// The zip first, so latest.json never points at a file that isn't there yet.
put(zip, ZIP_FILE);
put("latest.json", latest);
console.log(dryRun ? `\nDry run: ${JSON.stringify(release, null, 2)}` : `\nReleased ${version}.`);

if (verifyUrl && !dryRun) {
  const response = await fetch(`${verifyUrl.replace(/\/+$/, "")}/v1/update`, { headers: { "Cache-Control": "no-cache" } });
  const live = response.ok ? await response.json() : {};
  if (live.version !== version) throw new Error(`${verifyUrl} reports ${live.version ?? `HTTP ${response.status}`}, not ${version}`);
  console.log(`${verifyUrl} serves ${version}.`);
}
