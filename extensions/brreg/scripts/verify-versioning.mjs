import { readFileSync } from "node:fs";
import { join } from "node:path";

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const root = process.cwd();
const packageJsonPath = join(root, "package.json");
const constantsPath = join(root, "src/constants/index.ts");
const changelogPath = join(root, "CHANGELOG.md");

const packageJson = readJson(packageJsonPath);
const constants = readFileSync(constantsPath, "utf8");
const changelog = readFileSync(changelogPath, "utf8");

assertCondition(typeof packageJson.version === "string", "package.json must contain a string 'version' field.");

const packageVersion = packageJson.version.trim();
assertCondition(
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(packageVersion),
  `package.json version must be a valid semver string. Got '${packageVersion}'.`,
);

assertCondition(
  constants.includes("APP_VERSION = packageJson.version"),
  "APP_VERSION must be sourced from packageJson.version in src/constants/index.ts.",
);

assertCondition(
  constants.includes("Raycast-Brreg-Search/${APP_VERSION}"),
  "USER_AGENT must use APP_VERSION in src/constants/index.ts.",
);

const releaseDatePattern = String.raw`(?:\d{4}-\d{2}-\d{2}|\{PR_MERGE_DATE\})`;
const releaseHeadingMatch = changelog.match(
  new RegExp(String.raw`^## \[(\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?)\] - ${releaseDatePattern}$`, "m"),
);
assertCondition(
  Boolean(releaseHeadingMatch),
  "CHANGELOG.md must contain at least one release heading like: ## [1.2.3] - YYYY-MM-DD or ## [1.2.3] - {PR_MERGE_DATE}",
);

const changelogVersion = releaseHeadingMatch?.[1] ?? "";
assertCondition(
  changelogVersion === packageVersion,
  `Top changelog release version '${changelogVersion}' must match package.json version '${packageVersion}'.`,
);

console.log("Versioning consistency checks passed.");
