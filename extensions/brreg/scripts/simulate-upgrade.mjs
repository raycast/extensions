import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const flags = {
    to: undefined,
    bump: "patch",
    date: new Date().toISOString().slice(0, 10),
    verify: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--to") {
      flags.to = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--bump") {
      flags.bump = argv[i + 1] ?? "patch";
      i += 1;
      continue;
    }

    if (arg === "--date") {
      flags.date = argv[i + 1] ?? flags.date;
      i += 1;
      continue;
    }

    if (arg === "--no-verify") {
      flags.verify = false;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return flags;
}

function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  assertCondition(Boolean(match), `Expected plain semver 'x.y.z', got '${version}'.`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function bumpVersion(version, bumpType) {
  const { major, minor, patch } = parseSemver(version);

  if (bumpType === "patch") return `${major}.${minor}.${patch + 1}`;
  if (bumpType === "minor") return `${major}.${minor + 1}.0`;
  if (bumpType === "major") return `${major + 1}.0.0`;

  throw new Error(`Unsupported bump type '${bumpType}'. Use patch|minor|major.`);
}

function updateChangelogTopRelease(changelogSource, targetVersion, targetDate) {
  const releaseHeadingRegex = /^## \[(\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?)\] - (\d{4}-\d{2}-\d{2}|\{PR_MERGE_DATE\})$/m;
  const match = changelogSource.match(releaseHeadingRegex);

  if (!match) {
    const heading = `## [${targetVersion}] - ${targetDate}`;
    const insertion = `${heading}\n\n_Upgrade simulation_\n\n- Updated package version and release heading.\n\n`;
    return changelogSource.replace("# Brreg Search Changelog\n\n", `# Brreg Search Changelog\n\n${insertion}`);
  }

  const currentHeading = match[0];
  const nextHeading = `## [${targetVersion}] - ${targetDate}`;
  return changelogSource.replace(currentHeading, nextHeading);
}

function runVersioningScript(root) {
  return execSync("npm run test:versioning", { cwd: root, stdio: "inherit", encoding: "utf8" });
}

function runVersioningCheck(root) {
  try {
    execSync("npm run test:versioning", {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    return true;
  } catch (error) {
    const stderr = typeof error?.stderr === "string" ? error.stderr : (error?.stderr?.toString?.("utf8") ?? "");
    const stdout = typeof error?.stdout === "string" ? error.stdout : (error?.stdout?.toString?.("utf8") ?? "");
    const message = [stderr, stdout, String(error?.message || "")].join("\n");
    if (message.includes("Top changelog release version")) {
      return false;
    }

    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    throw error;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const packageJsonPath = join(root, "package.json");
  const packageLockPath = join(root, "package-lock.json");
  const changelogPath = join(root, "CHANGELOG.md");

  const packageJson = readJson(packageJsonPath);
  const packageLock = readJson(packageLockPath);
  const changelog = readFileSync(changelogPath, "utf8");

  assertCondition(typeof packageJson.version === "string", "package.json must contain a string 'version' field.");
  const originalVersion = packageJson.version.trim();

  const targetVersion = args.to ? args.to.trim() : bumpVersion(originalVersion, args.bump);
  parseSemver(targetVersion);

  packageJson.version = targetVersion;
  packageLock.version = targetVersion;
  if (packageLock.packages?.[""]) {
    packageLock.packages[""].version = targetVersion;
  }

  const nextChangelog = updateChangelogTopRelease(changelog, targetVersion, args.date);

  writeJson(packageJsonPath, packageJson);
  writeJson(packageLockPath, packageLock);
  writeFileSync(changelogPath, nextChangelog, "utf8");

  // If versioning fails (typically changelog/package mismatch), self-heal and retry once.
  if (args.verify) {
    const passed = runVersioningCheck(root);
    if (!passed) {
      const latestChangelog = readFileSync(changelogPath, "utf8");
      const healedChangelog = updateChangelogTopRelease(latestChangelog, targetVersion, args.date);
      writeFileSync(changelogPath, healedChangelog, "utf8");
      runVersioningScript(root);
    }
  }

  console.log(`Upgrade simulation complete: ${originalVersion} -> ${targetVersion}`);
  console.log("Updated files: package.json, package-lock.json, CHANGELOG.md");
}

main();
