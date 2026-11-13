import { createHash } from "node:crypto";

export const fallbackVersion = "0.2.1";
export const releaseRepository = "CaptureContext/fxcodex";
export const releaseArtifactName = "fxcodex-universal-apple-darwin";

const releasesAPIURL = `https://api.github.com/repos/${releaseRepository}/releases?per_page=100`;

export interface FXCodexRelease {
	version: string;
	name: string;
	url: string;
	publishedAt?: string;
	isPrerelease: boolean;
	artifactURL: string;
	checksumURL: string;
}

interface GitHubRelease {
	tag_name?: unknown;
	name?: unknown;
	html_url?: unknown;
	published_at?: unknown;
	draft?: unknown;
	prerelease?: unknown;
	assets?: unknown;
}

interface GitHubAsset {
	name?: unknown;
	browser_download_url?: unknown;
}

export async function fetchReleases(): Promise<FXCodexRelease[]> {
	const response = await fetch(releasesAPIURL, {
		headers: {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
		},
	});
	if (!response.ok) {
		throw new Error(`GitHub release lookup failed (${response.status} ${response.statusText}).`);
	}

	const value: unknown = await response.json();
	if (!Array.isArray(value)) throw new Error("GitHub returned an invalid release list.");

	return value.flatMap(parseRelease).sort((lhs, rhs) => compareVersions(rhs.version, lhs.version));
}

export async function downloadRelease(release: FXCodexRelease): Promise<{ executable: Uint8Array; checksum: string }> {
	const [artifactResponse, checksumResponse] = await Promise.all([
		fetch(release.artifactURL),
		fetch(release.checksumURL),
	]);
	if (!artifactResponse.ok) {
		throw new Error(`Downloading fxCodex ${release.version} failed (${artifactResponse.status}).`);
	}
	if (!checksumResponse.ok) {
		throw new Error(`Downloading the fxCodex ${release.version} checksum failed (${checksumResponse.status}).`);
	}

	const executable = new Uint8Array(await artifactResponse.arrayBuffer());
	const checksumContents = await checksumResponse.text();
	const checksum = checksumContents.trim().split(/\s+/)[0]?.toLowerCase();
	if (!checksum || !/^[a-f0-9]{64}$/.test(checksum)) {
		throw new Error(`fxCodex ${release.version} has an invalid checksum file.`);
	}

	const actual = createHash("sha256").update(executable).digest("hex");
	if (actual !== checksum) throw new Error(`fxCodex ${release.version} failed checksum verification.`);
	return { executable, checksum };
}

export function isFallbackRelease(release: FXCodexRelease): boolean {
	return release.version === fallbackVersion;
}

function parseRelease(value: unknown): FXCodexRelease[] {
	if (!isRecord(value)) return [];
	const release = value as GitHubRelease;
	if (release.draft === true || typeof release.tag_name !== "string" || !isSemanticVersion(release.tag_name)) return [];
	if (typeof release.html_url !== "string" || !Array.isArray(release.assets)) return [];

	const assets = release.assets.filter(isRecord) as GitHubAsset[];
	const artifactURL = assetURL(assets, releaseArtifactName);
	const checksumURL = assetURL(assets, `${releaseArtifactName}.sha256`);
	if (!artifactURL || !checksumURL) return [];

	return [
		{
			version: release.tag_name,
			name: typeof release.name === "string" && release.name.trim() ? release.name : `fxCodex ${release.tag_name}`,
			url: release.html_url,
			...(typeof release.published_at === "string" ? { publishedAt: release.published_at } : {}),
			isPrerelease: release.prerelease === true,
			artifactURL,
			checksumURL,
		},
	];
}

function assetURL(assets: GitHubAsset[], name: string): string | undefined {
	const asset = assets.find((candidate) => candidate.name === name);
	return typeof asset?.browser_download_url === "string" ? asset.browser_download_url : undefined;
}

function isSemanticVersion(value: string): boolean {
	return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

function compareVersions(lhs: string, rhs: string): number {
	const left = versionComponents(lhs);
	const right = versionComponents(rhs);
	for (let index = 0; index < 3; index += 1) {
		const comparison = (left.numbers[index] ?? 0) - (right.numbers[index] ?? 0);
		if (comparison !== 0) return comparison;
	}
	if (!left.prerelease && right.prerelease) return 1;
	if (left.prerelease && !right.prerelease) return -1;
	const leftIdentifiers = left.prerelease.split(".");
	const rightIdentifiers = right.prerelease.split(".");
	for (let index = 0; index < Math.max(leftIdentifiers.length, rightIdentifiers.length); index += 1) {
		const leftIdentifier = leftIdentifiers[index];
		const rightIdentifier = rightIdentifiers[index];
		if (leftIdentifier === undefined) return -1;
		if (rightIdentifier === undefined) return 1;
		if (leftIdentifier === rightIdentifier) continue;
		const leftNumber = /^\d+$/.test(leftIdentifier) ? Number(leftIdentifier) : undefined;
		const rightNumber = /^\d+$/.test(rightIdentifier) ? Number(rightIdentifier) : undefined;
		if (leftNumber !== undefined && rightNumber !== undefined) return leftNumber - rightNumber;
		if (leftNumber !== undefined) return -1;
		if (rightNumber !== undefined) return 1;
		return leftIdentifier.localeCompare(rightIdentifier);
	}
	return 0;
}

function versionComponents(value: string): { numbers: number[]; prerelease: string } {
	const withoutBuildMetadata = value.split("+")[0];
	const prereleaseSeparator = withoutBuildMetadata.indexOf("-");
	const core = prereleaseSeparator < 0 ? withoutBuildMetadata : withoutBuildMetadata.slice(0, prereleaseSeparator);
	const prerelease = prereleaseSeparator < 0 ? "" : withoutBuildMetadata.slice(prereleaseSeparator + 1);
	return { numbers: core.split(".").map(Number), prerelease };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
