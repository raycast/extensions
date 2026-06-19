import * as fs from "fs";
import * as path from "path";

const SCHEMA_DIR = path.join(__dirname, "..", "src", "schema");
const VERSION_FILE = path.join(SCHEMA_DIR, "version.json");
const LOADER_FILE = path.join(SCHEMA_DIR, "loader.ts");

const GITHUB_API_URL =
  "https://api.github.com/repos/osquery/osquery/releases/latest";
const SCHEMA_BASE_URL =
  "https://raw.githubusercontent.com/osquery/osquery-site/main/src/data/osquery_schema_versions";

interface VersionInfo {
  version: string;
  updatedAt: string;
}

interface GitHubRelease {
  tag_name: string;
}

async function getLatestVersion(): Promise<string> {
  const response = await fetch(GITHUB_API_URL, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "osquery-raycast-updater",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch latest release: ${response.statusText}`);
  }

  const data = (await response.json()) as GitHubRelease;
  // Remove 'v' prefix if present (e.g., "v5.21.0" -> "5.21.0")
  return data.tag_name.replace(/^v/, "");
}

function getCurrentVersion(): VersionInfo {
  const content = fs.readFileSync(VERSION_FILE, "utf-8");
  return JSON.parse(content) as VersionInfo;
}

async function downloadSchema(version: string): Promise<void> {
  const url = `${SCHEMA_BASE_URL}/${version}.json`;
  console.log(`Downloading schema from: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download schema: ${response.statusText}`);
  }

  const schema = await response.text();
  const schemaPath = path.join(SCHEMA_DIR, `schema-${version}.json`);

  fs.writeFileSync(schemaPath, schema);
  console.log(`Schema saved to: ${schemaPath}`);
}

function updateLoader(oldVersion: string, newVersion: string): void {
  let content = fs.readFileSync(LOADER_FILE, "utf-8");

  const oldImport = `./schema-${oldVersion}.json`;
  const newImport = `./schema-${newVersion}.json`;

  if (!content.includes(oldImport)) {
    throw new Error(`Could not find import "${oldImport}" in loader.ts`);
  }

  content = content.replace(oldImport, newImport);
  fs.writeFileSync(LOADER_FILE, content);
  console.log(`Updated loader.ts: ${oldImport} -> ${newImport}`);
}

function updateVersionFile(version: string): void {
  const versionInfo: VersionInfo = {
    version,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(VERSION_FILE, JSON.stringify(versionInfo, null, 2) + "\n");
  console.log(`Updated version.json to ${version}`);
}

function deleteOldSchema(version: string): void {
  const schemaPath = path.join(SCHEMA_DIR, `schema-${version}.json`);

  if (fs.existsSync(schemaPath)) {
    fs.unlinkSync(schemaPath);
    console.log(`Deleted old schema: ${schemaPath}`);
  }
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;

    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }

  return 0;
}

async function main(): Promise<void> {
  console.log("Checking for osquery schema updates...\n");

  const currentVersionInfo = getCurrentVersion();
  const currentVersion = currentVersionInfo.version;
  console.log(`Current version: ${currentVersion}`);

  const latestVersion = await getLatestVersion();
  console.log(`Latest version: ${latestVersion}`);

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    console.log("\nSchema is already up to date.");
    process.exit(1); // Exit with 1 = no update needed
  }

  console.log(`\nNew version available: ${currentVersion} -> ${latestVersion}`);

  try {
    await downloadSchema(latestVersion);
    updateLoader(currentVersion, latestVersion);
    updateVersionFile(latestVersion);
    deleteOldSchema(currentVersion);

    console.log("\nSchema update complete!");
    process.exit(0); // Exit with 0 = update successful
  } catch (error) {
    console.error("\nError during update:", error);
    process.exit(2); // Exit with 2 = error
  }
}

main();
