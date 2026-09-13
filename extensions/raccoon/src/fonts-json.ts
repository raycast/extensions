import { expectObject } from "./json-out.ts";

/**
 * `rcc fonts --json`.
 *
 * Two questions: where the fonts are, and whether any of them is broken. The
 * counts are context; the corrupted ones are the only thing to act on.
 */
export type FontSource = { path: string; count: number };

export type FontsReport = {
	sources: FontSource[];
	installed: number;
	fontconfig: {
		available: boolean;
		fonts: number;
		families: number;
		duplicate_families: number;
	};
	corrupted: number;
};

const num = (v: unknown) => (typeof v === "number" ? v : 0);

export function parseFonts(stdout: string): FontsReport {
	const r = expectObject(stdout, "fonts");
	const f = (r.fontconfig ?? {}) as Record<string, unknown>;
	return {
		sources: Array.isArray(r.sources)
			? r.sources.map((v) => {
					const s = (v ?? {}) as Record<string, unknown>;
					return {
						path: typeof s.path === "string" ? s.path : "",
						count: num(s.count),
					};
				})
			: [],
		installed: num(r.installed),
		fontconfig: {
			available: f.available === true,
			fonts: num(f.fonts),
			families: num(f.families),
			duplicate_families: num(f.duplicate_families),
		},
		corrupted: num(r.corrupted),
	};
}

/** The short name of a font directory: the two differ only in their prefix. */
/**
 * Who put the fonts in a folder, which is the only thing that decides whether
 * you can do anything about them.
 *
 * Order matters and got this wrong once: `/System/Library/Fonts` does not
 * start with `/Library/`, so it fell through to the check for a home folder
 * and came out labelled "Yours" — the fonts you are least able to touch,
 * named as the ones that are most yours.
 */
export function sourceLabel(path: string): string {
	if (path.startsWith("/System/Library/")) return "macOS";
	if (path.startsWith("/Library/")) return "All users";
	if (path.includes("/Library/Fonts")) return "Yours";
	return path;
}
