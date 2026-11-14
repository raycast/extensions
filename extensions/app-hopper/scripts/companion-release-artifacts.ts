import { copyFileSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { companionReleasePlan } from "./companion-release-plan";

type ReleasePlan = ReturnType<typeof companionReleasePlan>;
type CompanionManifest = { version: string; browser_specific_settings: { gecko: { id: string } } };

const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Both release paths inspect the same archive; CI additionally requires an exact build match. */
function inspectPackage(file: string, root: string, expectedBackground?: Buffer) {
  const bytes = readFileSync(file);
  if (bytes.length > 10 * 1024 * 1024) throw new Error("Companion XPI exceeds the download size limit");
  const unzip = (name: string) => execFileSync("/usr/bin/unzip", ["-p", file, name], { maxBuffer: 10 * 1024 * 1024 });
  const manifest: CompanionManifest = JSON.parse(unzip("manifest.json").toString("utf8"));
  const expected: CompanionManifest = JSON.parse(readFileSync(path.join(root, "companion/manifest.json"), "utf8"));
  if (
    manifest.browser_specific_settings?.gecko?.id !== expected.browser_specific_settings.gecko.id ||
    manifest.version !== expected.version
  ) {
    throw new Error("The XPI identity and version must match companion/manifest.json");
  }
  const names = execFileSync("/usr/bin/unzip", ["-Z1", file], { encoding: "utf8", maxBuffer: 1024 * 1024 })
    .trim()
    .split("\n");
  if (!names.some((name) => /^META-INF\/(mozilla\.rsa|cose\.sig)$/i.test(name))) {
    throw new Error("Mozilla signature files are missing. Obtain an unlisted signed XPI first.");
  }
  if (expectedBackground) {
    if (names.some((name) => !["manifest.json", "background.js"].includes(name) && !name.startsWith("META-INF/"))) {
      throw new Error("Unexpected files in signed companion");
    }
    if (!isDeepStrictEqual(manifest, expected)) throw new Error("Signed manifest differs from release source");
    if (!unzip("background.js").equals(expectedBackground))
      throw new Error("Signed background differs from release build");
  }
  return { version: manifest.version, sha256: digest(bytes) };
}

function pinnedConfig(artifact: { version: string; sha256: string }, xpiUrl: string) {
  return JSON.stringify({ companion: { version: artifact.version, xpiUrl, sha256: artifact.sha256 } }, null, 2) + "\n";
}

/** Pin an already signed manual release; the browser verifies the cryptographic signature. */
export function pinCompanionRelease(root: string, file: string, downloadUrl: string) {
  const url = new URL(downloadUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.hash || !url.pathname.endsWith(".xpi")) {
    throw new Error("Provide a direct HTTPS XPI download URL without credentials or fragments");
  }
  const artifact = inspectPackage(file, root);
  const output = path.join(root, "assets/companion-integration.json");
  const temp = `${output}.tmp`;
  writeFileSync(temp, pinnedConfig(artifact, url.href));
  renameSync(temp, output);
  return artifact;
}

/** Validate everything before preparing release outputs or changing the download pin. */
export function prepareCompanionRelease(root: string, plan: ReleasePlan, publish: boolean) {
  const fromRoot = (file: string) => path.join(root, file);
  const signedDirectory = fromRoot("dist/companion/signed");
  const files = readdirSync(signedDirectory).filter((file) => file.endsWith(".xpi"));
  if (files.length !== 1) throw new Error("Expected exactly one Mozilla-signed XPI");
  const signed = path.join(signedDirectory, files[0]);
  const artifact = inspectPackage(signed, root, readFileSync(fromRoot("dist/companion/extension/background.js")));
  const source = readFileSync(fromRoot(plan.source));
  const directory = fromRoot("dist/companion/release");
  mkdirSync(directory, { recursive: true });
  copyFileSync(signed, fromRoot(plan.signed));
  const sourceName = path.basename(plan.source);
  writeFileSync(path.join(directory, sourceName), source);
  writeFileSync(
    path.join(directory, "SHA256SUMS"),
    `${artifact.sha256}  ${path.basename(plan.signed)}\n${digest(source)}  ${sourceName}\n`,
  );
  writeFileSync(
    path.join(directory, "release-notes.md"),
    `# App Hopper Companion ${plan.version}\n\nMozilla-signed companion shared by Firefox and Zen.\n\nInstall App Hopper, run the matching browser integration setup, and confirm installation of the signed XPI. Zen cross-workspace support additionally requires the separate local workspace bridge.\n\nSource, pinned build dependencies and rebuild instructions are included in the source ZIP. SHA256SUMS covers both downloadable packages.\n`,
  );
  const config = pinnedConfig(artifact, plan.url);
  writeFileSync(path.join(directory, "companion-integration.json"), config);
  if (publish) writeFileSync(fromRoot("assets/companion-integration.json"), config);
}
