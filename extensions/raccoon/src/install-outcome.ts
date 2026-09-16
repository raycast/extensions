import type { RccExit } from "./exit.ts";

/**
 * How the Homebrew install ended, as something the screen can say out loud.
 *
 * Pulled out of the view because of what the number alone does not carry: a
 * command that was killed reports no exit code at all, which arrives as 0 and
 * reads as success. The screen then showed nothing, having installed nothing,
 * and the reader was left to work that out from an unchanged screen.
 */
export type InstallOutcome = { installed: true } | { installed: false; why: string };

export function installOutcome(exit: RccExit, command: string): InstallOutcome {
	if (exit.signal !== null) {
		return { installed: false, why: `${command} was stopped by ${exit.signal}. The output is above.` };
	}
	if (exit.code !== 0) {
		return { installed: false, why: `${command} exited with status ${exit.code}. The output is above.` };
	}
	return { installed: true };
}
