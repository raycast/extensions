import type { RccExit } from "./exit.ts";

/**
 * How the Homebrew install ended, as something the screen can say out loud.
 *
 * Pulled out of the view because of what the number alone does not carry: a
 * command that was killed reports no exit code at all, which arrives as 0 and
 * reads as success. The screen then showed nothing, having installed nothing,
 * and the reader was left to work that out from an unchanged screen.
 */
export type InstallOutcome = { installed: true } | { installed: false; why: string; stopped: boolean };

export function installOutcome(exit: RccExit, command: string): InstallOutcome {
	// `stopped` because the two are not the same news: brew refusing is
	// something the reader has to be told, while a reader who pressed Stop
	// already knows, and being shown a failure for it reads as a bug.
	if (exit.signal !== null) {
		return {
			installed: false,
			why: `${command} was stopped by ${exit.signal}. The output is above.`,
			stopped: true,
		};
	}
	if (exit.code !== 0) {
		return {
			installed: false,
			why: `${command} exited with status ${exit.code}. The output is above.`,
			stopped: false,
		};
	}
	return { installed: true };
}
