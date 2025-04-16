import {runAppleScript} from "@raycast/utils";

export function runInTerminal(command: string, preferredTerminal: string) {
	console.log(preferredTerminal)
	Promise.resolve(
		runAppleScript(`tell application "Terminal"
        activate
        do script "${command}"
    end tell`)
	);
}

export function openInTerminal(file: string, preferredTerminal = "Terminal") {
	// Show the man page in a new Terminal tab
	runInTerminal(`vi ${file}`, preferredTerminal);
}
