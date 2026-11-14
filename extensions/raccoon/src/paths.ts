import { homedir } from "node:os";

/**
 * A path as a person would write it: `~/Library/…` rather than
 * `/Users/someone/Library/…`.
 *
 * Every screen that shows a path shows it this way. The prefix is the same on
 * every row, so it costs a third of the width and says nothing; what the reader
 * is looking for is the end of the path, which is what gets truncated away when
 * the start is spelled out in full.
 */
export function shortPath(path: string, home: string): string {
	return path === home ? "~" : path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

/** `shortPath` against this account's own home. */
export function tilde(path: string): string {
	return shortPath(path, homedir());
}
