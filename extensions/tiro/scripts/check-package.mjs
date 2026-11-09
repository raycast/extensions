import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { spawnSync } from "node:child_process";
const target = resolve(process.argv[2] || "");
if (!process.argv[2]) throw new Error("Pass the isolated release directory to inspect.");
const failures = [];
const forbiddenNames = /(^|\/)(?:\.git|node_modules|\.env(?:\.[^/]*)?|data\.json|credentials?\.(?:json|ya?ml|txt)|.*\.(?:map|pem|key|p12|pfx))($|\/)/i;
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/,
  /AKIA[0-9A-Z]{16}/,
  /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/,
];
let files = 0;
function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const file = join(directory, entry), name = relative(target, file).replaceAll("\\", "/");
    if (forbiddenNames.test(name)) { failures.push(`${name}: forbidden release path`); continue; }
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) { failures.push(`${name}: symlink`); continue; }
    if (stat.isDirectory()) { walk(file); continue; }
    files++;
    if (!/\.(?:[cm]?js|ts|tsx|json|html|css|md|ya?ml|txt)$/i.test(name)) continue;
    const text = readFileSync(file, "utf8");
    if (/sourceMappingURL\s*=|sourceURL\s*=/i.test(text)) failures.push(`${name}: source map or source reference`);
    if (/\/(?:Users|home)\/[^/\s]+\/|plato-corp\/tiro-client|theplatocorp\.slack\.com|PR #\d+/.test(text)) failures.push(`${name}: internal context`);
    if (secretPatterns.some(pattern => pattern.test(text))) failures.push(`${name}: secret signature (value redacted)`);
  }
}
walk(target);
const scan = spawnSync("gitleaks", ["dir", target, "--no-banner", "--no-color", "--redact=100", "--ignore-gitleaks-allow"], { encoding: "utf8" });
if (scan.error || scan.status !== 0) failures.push("Gitleaks must be installed and return no findings.");
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(JSON.stringify({ status: "passed", files, sourceMaps: 0, secretSignatures: 0, gitleaks: "passed" }));
