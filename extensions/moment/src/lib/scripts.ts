// Pure: no @raycast import, so `node --test` loads it.
//
// One AppleScript per command, by raw Apple event codes (FF-1280's
// MomentMac/Moment.sdef), so it compiles without Moment's dictionary: an
// older Moment answers -1708 instead of the script failing to compile. The
// target is argv's first item, never a literal, so compiling never looks
// Moment up. Every outcome prints one line; errors are caught by number.
// The running check, which picks the Moment to ask when both builds are
// installed, takes its bundle ids from argv too.

import type { Command } from "./timer.ts";

/** Each command's Apple event: the suite's code `Mmnt`, then the event ID. */
export const EVENT_CODES: Record<Command, string> = {
  startFocus: "MmntStFc",
  pauseTimer: "MmntPaus",
  resumeTimer: "MmntRsum",
  addTime: "MmntAddT",
  stopTimer: "MmntStop",
  checkTimer: "MmntChck",
};

/** `timer info`'s properties, in the order the reply line prints them: state, kind, time left, duration, capped. */
export const RECORD_PROPERTY_CODES = ["MmSt", "kind", "MmTl", "MmDu", "MmCp"] as const;

/** Seconds AppleScript waits for Moment: a cold launch, Moment's own 5 s launch wait, and the first Automation prompt. */
export const APPLE_EVENT_TIMEOUT_SECONDS = 20;
/** Start's read of the session in flight, after Moment has just answered. */
export const FOLLOW_UP_TIMEOUT_SECONDS = 5;
/** runAppleScript's own limit: past both AppleScript waits, so AppleScript's -1712 arrives first. */
export const SCRIPT_TIMEOUT_MILLISECONDS = 30_000;

/** Start focus and add time take whole minutes as their direct parameter. */
export function takesMinutes(command: Command): boolean {
  return command === "startFocus" || command === "addTime";
}

function event(command: Command): string {
  return `«event ${EVENT_CODES[command]}»`;
}

/** The send itself. The minutes are read from argv outside the `tell`, so only the event goes to Moment. */
function send(command: Command): string {
  if (!takesMinutes(command)) return `tell application id moment to set r to ${event(command)}`;
  return `if (count of argv) > 1 then
				set wholeMinutes to (item 2 of argv) as integer
				tell application id moment to set r to ${event(command)} wholeMinutes
			else
				tell application id moment to set r to ${event(command)}
			end if`;
}

/** Start's refusal (1006) reads the session in flight, so the line can name it from data. */
const START_REFUSAL = `if n is 1006 then
			try
				with timeout of ${FOLLOW_UP_TIMEOUT_SECONDS} seconds
					tell application id moment to set r to ${event("checkTimer")}
				end timeout
				return my replyLine("refused" & tab & n, r)
			end try
		end if
		`;

/** Fields are read by raw code outside the `tell`; `line` is a reserved word, hence `replyLine`. */
const REPLY_LINE = `on replyLine(head, r)
	return head & tab & ${RECORD_PROPERTY_CODES.map((code) => `(«class ${code}» of r)`).join(" & tab & ")}
end replyLine`;

export function scriptFor(command: Command): string {
  return `on run argv
	set moment to item 1 of argv
	try
		with timeout of ${APPLE_EVENT_TIMEOUT_SECONDS} seconds
			${send(command)}
		end timeout
		return my replyLine("ok", r)
	on error msg number n
		${command === "startFocus" ? START_REFUSAL : ""}return "error" & tab & n & tab & msg
	end try
end run

${REPLY_LINE}
`;
}

/** argv: the bundle id, then the minutes when given (never interpolated into the source). */
export function argumentsFor(bundleId: string, minutes: number | undefined): string[] {
  return minutes === undefined ? [bundleId] : [bundleId, String(minutes)];
}

/**
 * The running check, asked only when both Moments are installed: prints which
 * of argv's bundle ids are running, tab-separated. It only asks, so it
 * launches nothing and sends no Apple event (no Automation prompt). An id
 * that isn't installed raises -1728, so each is asked in its own `try`.
 */
export const RUNNING_SCRIPT = `on run argv
	set runningIds to {}
	repeat with candidate in argv
		set bundleId to contents of candidate
		try
			if (application id bundleId) is running then set end of runningIds to bundleId
		end try
	end repeat
	set AppleScript's text item delimiters to tab
	return runningIds as text
end run
`;

/** runAppleScript's limit on the running check: a stuck check delays a command by this at most. */
export const RUNNING_CHECK_TIMEOUT_MILLISECONDS = 5_000;
