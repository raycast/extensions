/**
 * What version of rcc is installed, for the few features that need a recent one.
 *
 * A capability probe is better and is what `--fix-only` gets: `rcc audit --help`
 * lists that flag, so the question can be asked of the binary itself. It does
 * not list `--export`, although the release that introduced it accepts it, so
 * for that one the printed version number is the only thing on hand.
 */
export type RccVersion = [major: number, minor: number, patch: number];

/**
 * The version out of `rcc --version` ("Raccoon version 1.0.1", then a tagline).
 *
 * Undefined rather than a guess when there is no number to read: a version that
 * cannot be determined must not be treated as too old, or a working install is
 * refused on the strength of a banner change.
 */
export function parseRccVersion(output: string): RccVersion | undefined {
	const found = output.match(/(\d+)\.(\d+)\.(\d+)/);
	if (!found) return undefined;
	return [Number(found[1]), Number(found[2]), Number(found[3])];
}

/** Whether `version` is `minimum` or newer, compared part by part. */
export function isAtLeast(version: RccVersion, minimum: RccVersion): boolean {
	for (let part = 0; part < version.length; part++) {
		if (version[part] !== minimum[part]) return version[part] > minimum[part];
	}
	return true;
}

/**
 * Whether the rcc that printed this banner is new enough for a feature.
 *
 * A version that cannot be read is allowed through. The banner is not a
 * contract, and refusing a working install because its first line changed
 * would be the worse of the two failures: the feature then reports what
 * actually went wrong instead.
 */
export function meetsMinimum(versionOutput: string, minimum: RccVersion): boolean {
	const version = parseRccVersion(versionOutput);
	return version === undefined || isAtLeast(version, minimum);
}
