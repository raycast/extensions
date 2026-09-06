import { timeoutSignal } from "./constants";

export const MAVEN_REPOSITORY =
  "https://repo.papermc.io/repository/maven-public/";
export const GROUP_ID = "dev.folia";
export const ARTIFACT_ID = "folia-api";

// dev.folia:folia-api's version scheme changed over time: older Minecraft
// versions publish a plain -R0.1-SNAPSHOT, newer ones a dated build number
// under a "beta"/"stable" suffix that keeps incrementing. The first two are
// stable, single, already-released artifacts; "26.2" tracks the newest
// artifact PaperMC has published, so it is resolved live instead of pinned,
// or a shipped version would silently go stale the next time Folia builds.
const PINNED_ARTIFACT_VERSION: Record<string, string> = {
  "26.1.2": "26.1.2.build.8-stable",
  "1.21.11": "1.21.11-R0.1-SNAPSHOT",
};

async function fetchLatestBuild(): Promise<string> {
  const response = await fetch(
    `${MAVEN_REPOSITORY}dev/folia/folia-api/maven-metadata.xml`,
    {
      signal: timeoutSignal(),
    },
  );
  if (!response.ok)
    throw new Error(
      `Failed to resolve the latest folia-api build (HTTP ${response.status})`,
    );
  const xml = await response.text();
  const release = /<release>([^<]+)<\/release>/.exec(xml)?.[1];
  const latest = /<latest>([^<]+)<\/latest>/.exec(xml)?.[1];
  const version = release ?? latest;
  if (!version)
    throw new Error(
      "Could not find a release version in folia-api's Maven metadata",
    );
  return version;
}

export async function resolveArtifactVersion(
  docsVersion: string,
): Promise<string> {
  return PINNED_ARTIFACT_VERSION[docsVersion] ?? fetchLatestBuild();
}

export function gradleKotlinDsl(version: string): string {
  return [
    "repositories {",
    `    maven("${MAVEN_REPOSITORY}")`,
    "}",
    "",
    "dependencies {",
    `    compileOnly("${GROUP_ID}:${ARTIFACT_ID}:${version}")`,
    "}",
  ].join("\n");
}

export function mavenXml(version: string): string {
  return [
    "<repository>",
    "    <id>papermc</id>",
    `    <url>${MAVEN_REPOSITORY}</url>`,
    "</repository>",
    "",
    "<dependency>",
    `    <groupId>${GROUP_ID}</groupId>`,
    `    <artifactId>${ARTIFACT_ID}</artifactId>`,
    `    <version>${version}</version>`,
    "    <scope>provided</scope>",
    "</dependency>",
  ].join("\n");
}
