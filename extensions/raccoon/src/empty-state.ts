/** What a list shows when it has no rows. */
export type EmptyState = { title: string; description: string };

/**
 * Nothing there, or nothing readable - which are not the same answer.
 *
 * A usePromise that rejects leaves `data` undefined, and a screen that renders
 * its ordinary empty state from that tells the reader there is nothing, when
 * what happened is that nobody could look. The toast Raycast raises for the
 * rejection is gone in seconds; the empty state stays on screen.
 */
export function emptyState(error: unknown, whenEmpty: EmptyState, subject: string): EmptyState {
	if (error === undefined || error === null) return whenEmpty;
	return {
		title: `${subject} could not be read`,
		description: error instanceof Error ? error.message : String(error),
	};
}
