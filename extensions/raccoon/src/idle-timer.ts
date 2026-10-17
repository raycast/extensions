/**
 * How long a streamed run may say nothing before it is given up on.
 *
 * Measured, not guessed: this repo's own audit-groups.ts records the `core`
 * group taking **615 seconds** on one Mac, sitting on `softwareupdate -l`,
 * and `audit deep` runs through this same path. The window has to be well
 * above that, or a healthy deep audit gets killed mid-check and reported as
 * hung. Fifteen minutes leaves room; anyone tempted to shrink it should first
 * watch how long rcc can legitimately stay quiet.
 */
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

/** A run that has stopped saying anything, and how to keep telling it apart. */
export type IdleTimer = {
	/** Output arrived: the run is alive, start the wait again. */
	poke(): void;
	/** The run ended, by any route. Nothing more should fire. */
	stop(): void;
};

/**
 * Give up on a run that has gone quiet, and only on that.
 *
 * Silence rather than duration, because the commands on this path are
 * legitimately long: a Homebrew upgrade prints for as long as it takes and is
 * working the whole time. What is not working is a command that has printed
 * nothing for a quarter of an hour.
 *
 * Fires at most once. A poke after it has fired does not arm it again: chunks
 * still draining out of a pipe belong to the run that was given up on, and
 * letting them restart the wait would hide the very thing this exists to catch.
 */
export function idleTimer(ms: number, onIdle: () => void): IdleTimer {
	let fired = false;
	let handle: ReturnType<typeof setTimeout> | undefined = setTimeout(fire, ms);

	function fire() {
		fired = true;
		handle = undefined;
		onIdle();
	}

	return {
		poke() {
			if (fired || handle === undefined) return;
			clearTimeout(handle);
			handle = setTimeout(fire, ms);
		},
		stop() {
			if (handle !== undefined) clearTimeout(handle);
			handle = undefined;
			fired = true;
		},
	};
}
