import { type TrashReport } from "./simple-json.ts";

function plural(n: number, word: string): string {
	return `${n} ${n === 1 ? word : `${word}s`}`;
}

/**
 * What the confirmation says before the trash is emptied.
 *
 * Finder empties every mounted volume's trash at once, not only the one in the
 * reader's home, so a dialog that counts the home trash alone understates what
 * is about to be deleted - by a whole external drive, on the Mac where it
 * matters most. rcc reports the other volumes, so they are named here rather
 * than discovered afterwards.
 */
export function trashDetail(t: TrashReport): string {
	const here = `${plural(t.count, "item")}, ${t.size}`;
	if (t.volumes.length === 0) return here;
	const elsewhere = t.volumes.reduce((total, v) => total + v.count, 0);
	return `${here} here, and ${plural(elsewhere, "item")} on ${plural(
		t.volumes.length,
		"other volume",
	)}. Emptying the trash empties every volume.`;
}

/** Everything the one command would delete, for the row that offers it. */
export function trashTotal(t: TrashReport): number {
	return t.volumes.reduce((total, v) => total + v.count, t.count);
}

/**
 * The name a reader would use for a volume's trash: the volume, not the path.
 * `/Volumes/Backup/.Trashes/501` is "Backup" to everyone except the filesystem.
 */
export function volumeName(path: string): string {
	return /^\/Volumes\/([^/]+)\//.exec(path)?.[1] ?? path;
}
