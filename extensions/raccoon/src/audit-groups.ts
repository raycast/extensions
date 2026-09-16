/**
 * Which groups of checks `rcc audit` knows, and which one the rest must not
 * wait for.
 *
 * Measured one afternoon on one Mac, group by group: core took 615s and
 * network, auth, persistence and additional took 2s between them. All of that
 * is one check inside core - Software Updates - which asks Apple's servers, so
 * how long it takes belongs to them rather than to the audit. Run as a single
 * command, twenty-four checks that were ready in two seconds wait for the
 * others, and a screen that shows nothing for ten minutes reads as a broken
 * one.
 */
export const SLOW_GROUP = "core";

/**
 * The group names out of `rcc audit --list-checks`.
 *
 * Read from the CLI rather than written down here: a group added to rcc later
 * would otherwise be silently left out of the audit this screen shows, which is
 * the kind of missing check nobody notices.
 */
export function parseGroups(listChecks: string): string[] {
	return listChecks
		.split("\n")
		.map((line) => line.match(/^ {2}([a-z][a-z0-9-]*) {2,}\S/))
		.filter((found): found is RegExpMatchArray => found !== null)
		.map((found) => found[1]);
}

/**
 * The two runs to make: everything that answers at once, then the one that
 * does not.
 *
 * Undefined when the split cannot be made - no groups read, or none of them the
 * slow one - so the caller runs the audit whole rather than inventing a plan
 * out of a list it did not understand.
 */
export function splitGroups(groups: string[]): { fast: string[]; slow: string } | undefined {
	if (!groups.includes(SLOW_GROUP)) return undefined;
	const fast = groups.filter((group) => group !== SLOW_GROUP);
	return fast.length > 0 ? { fast, slow: SLOW_GROUP } : undefined;
}
