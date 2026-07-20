import {
  GitHubRelease,
  BiomeSchema,
  BiomeRulesCache,
} from "../types/biome-schema";
import { transformSchemaToRules } from "./transform-schema";

const githubApi = "https://api.github.com/repos/biomejs/biome/releases";
const schemaBase = "https://biomejs.dev/schemas";

export async function fetchLatestBiomeRules(): Promise<BiomeRulesCache> {
  try {
    // Step 1: Fetch latest release
    console.log("Fetching latest Biome release...");
    const release = await fetchLatestRelease();
    const version = parseVersion(release.tag_name);
    console.log("Got latest version:", version);

    // Step 2: Fetch schema for that version
    console.log("Fetching schema for version:", version);
    const schema = await fetchSchema(version);
    console.log("Schema fetched, transforming to rules...");

    // Step 3: Transform schema to rules with version information (from static JSON)
    const rules = transformSchemaToRules(schema, version);
    console.log(`Transformed ${rules.length} rules with metadata`);

    return {
      version,
      rules,
      fetchedAt: Date.now(),
      changelog: release.body,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error in fetchLatestBiomeRules:", errorMsg);
    throw new Error(`Failed to fetch Biome rules: ${errorMsg}`);
  }
}

async function fetchLatestRelease(): Promise<GitHubRelease> {
  const response = await fetch(githubApi, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Raycast-Biome-Extension",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const releases: GitHubRelease[] = await response.json();

  // Filter out prereleases, get the latest stable
  const stableReleases = releases.filter((r) => !r.prerelease);

  if (stableReleases.length === 0) {
    throw new Error("No stable releases found");
  }

  return stableReleases[0];
}

async function fetchSchema(version: string): Promise<BiomeSchema> {
  const schemaUrl = `${schemaBase}/${version}/schema.json`;

  const response = await fetch(schemaUrl);

  if (!response.ok) {
    throw new Error(
      `Schema fetch error: ${response.status} for version ${version}`,
    );
  }

  return await response.json();
}

function parseVersion(tagName: string): string {
  // Handle formats like:
  // - "@biomejs/biome@2.3.6" → "2.3.6"
  // - "cli/v2.3.6" → "2.3.6"
  // - "v2.3.6" → "2.3.6"
  // - "2.3.6" → "2.3.6"
  const match = tagName.match(/(\d+\.\d+\.\d+)/);

  if (!match) {
    throw new Error(`Invalid version format: ${tagName}`);
  }

  return match[1];
}
