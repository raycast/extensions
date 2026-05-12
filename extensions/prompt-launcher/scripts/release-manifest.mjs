import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, ".github", "release-manifest.json");
const supportedCommands = ["validate", "body", "outputs"];

const command = process.argv[2];

if (!supportedCommands.includes(command)) {
  throw new Error("Usage: node scripts/release-manifest.mjs validate|body|outputs [--publish-to-raycast true|false]");
}

const manifest = await readJson(manifestPath);

if (command === "validate") {
  const publishToRaycast = readBooleanOption("--publish-to-raycast");
  await validateManifest(manifest, { publishToRaycast });
}

if (command === "body") {
  await validateManifest(manifest);
  process.stdout.write(`${await createReleaseBody(manifest)}\n`);
}

if (command === "outputs") {
  await validateManifest(manifest);
  process.stdout.write(`tag=${manifest.tag}\n`);
  process.stdout.write(`title=${manifest.title}\n`);
}

async function validateManifest(releaseManifest, options = {}) {
  assert.equal(typeof releaseManifest.tag, "string", "release-manifest.json tag must be a string");
  assert.match(releaseManifest.tag, /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, "tag must use vX.Y.Z format");

  assert.equal(typeof releaseManifest.title, "string", "release-manifest.json title must be a string");
  assert(releaseManifest.title.length > 0, "release title must not be empty");

  assert.equal(typeof releaseManifest.previousGitHubReleaseTag, "string", "previousGitHubReleaseTag must be a string");
  assert.match(
    releaseManifest.previousGitHubReleaseTag,
    /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/,
    "previousGitHubReleaseTag must use vX.Y.Z format",
  );
  assert.notEqual(
    releaseManifest.previousGitHubReleaseTag,
    releaseManifest.tag,
    "previousGitHubReleaseTag must not be the same as tag",
  );

  assert.equal(
    typeof releaseManifest.githubReleaseChangelogFile,
    "string",
    "githubReleaseChangelogFile must be a string",
  );
  assert(
    releaseManifest.githubReleaseChangelogFile.startsWith(".github/release-changelog/"),
    "githubReleaseChangelogFile must be under .github/release-changelog/",
  );
  assert(
    releaseManifest.githubReleaseChangelogFile.endsWith(`${releaseManifest.tag}.md`),
    "githubReleaseChangelogFile file name must match tag",
  );

  if (releaseManifest.previousRaycastStorePublishTag !== null) {
    assert.equal(
      typeof releaseManifest.previousRaycastStorePublishTag,
      "string",
      "previousRaycastStorePublishTag must be null or a string",
    );
    assert.match(
      releaseManifest.previousRaycastStorePublishTag,
      /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/,
      "previousRaycastStorePublishTag must use vX.Y.Z format",
    );
    assert.notEqual(
      releaseManifest.previousRaycastStorePublishTag,
      releaseManifest.tag,
      "previousRaycastStorePublishTag must not be the same as tag",
    );
  }

  const changelogText = await readReleaseChangelogFile(releaseManifest.githubReleaseChangelogFile);
  assert(changelogText.trim().length > 0, "githubReleaseChangelogFile must not be empty");

  if (options.publishToRaycast) {
    await validateRaycastStoreVersionHistory();
  }
}

async function createReleaseBody(releaseManifest) {
  return (await readReleaseChangelogFile(releaseManifest.githubReleaseChangelogFile)).trimEnd();
}

async function readReleaseChangelogFile(file) {
  return readFile(path.join(repoRoot, file), "utf8");
}

async function validateRaycastStoreVersionHistory() {
  const changelogText = await readFile(path.join(repoRoot, "CHANGELOG.md"), "utf8");
  const changelogLines = changelogText.split(/\r?\n/);
  const firstEntryStartIndex = changelogLines.findIndex((line) => line.startsWith("## "));

  assert.notEqual(firstEntryStartIndex, -1, "CHANGELOG.md must contain a Raycast Store Version History entry");

  const firstEntryHeading = changelogLines[firstEntryStartIndex];
  assert.match(
    firstEntryHeading,
    /^## \[[^\]]+\] - \{PR_MERGE_DATE\}$/,
    "CHANGELOG.md first entry must use ## [Title] - {PR_MERGE_DATE} format",
  );

  const firstEntryBodyLines = [];

  for (let index = firstEntryStartIndex + 1; index < changelogLines.length; index += 1) {
    if (changelogLines[index].startsWith("## ")) {
      break;
    }

    firstEntryBodyLines.push(changelogLines[index]);
  }

  assert(
    firstEntryBodyLines.some((line) => line.trim().length > 0),
    "CHANGELOG.md first entry body must not be empty",
  );
}

function readBooleanOption(name) {
  const optionIndex = process.argv.indexOf(name);

  if (optionIndex === -1) {
    return false;
  }

  const value = process.argv[optionIndex + 1];

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${name} must be true or false`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
