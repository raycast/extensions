import { runAppleScript } from "@raycast/utils";

export async function getCurrentURL(): Promise<string> {
	// Try Safari first (most common)
	const safariScript = `
		try
			tell application "Safari"
				if (count of windows) > 0 then
					return URL of current tab of front window
				else
					error "No Safari windows open"
				end if
			end tell
		on error
			error "Safari not available"
		end try
	`;

	try {
		const result = await runAppleScript(safariScript);
		return result.trim();
	} catch (safariError) {
		// If Safari fails, try Chrome
		const chromeScript = `
			try
				tell application "Google Chrome"
					if (count of windows) > 0 then
						return URL of active tab of front window
					else
						error "No Chrome windows open"
					end if
				end tell
			on error
				error "Chrome not available"
			end try
		`;

		try {
			const result = await runAppleScript(chromeScript);
			return result.trim();
		} catch (chromeError) {
			throw new Error(
				"Failed to get URL from Safari or Chrome. Make sure you have a webpage open and have granted accessibility permissions to Raycast."
			);
		}
	}
}

export async function getPageTitle(): Promise<string> {
	// Try Safari first
	const safariScript = `
		try
			tell application "Safari"
				if (count of windows) > 0 then
					return name of current tab of front window
				else
					error "No Safari windows open"
				end if
			end tell
		on error
			error "Safari not available"
		end try
	`;

	try {
		const result = await runAppleScript(safariScript);
		return result.trim();
	} catch (safariError) {
		// If Safari fails, try Chrome
		const chromeScript = `
			try
				tell application "Google Chrome"
					if (count of windows) > 0 then
						return title of active tab of front window
					else
						error "No Chrome windows open"
					end if
				end tell
			on error
				error "Chrome not available"
			end try
		`;

		try {
			const result = await runAppleScript(chromeScript);
			return result.trim();
		} catch (chromeError) {
			throw new Error(
				"Failed to get page title from Safari or Chrome. Make sure you have a webpage open and have granted accessibility permissions to Raycast."
			);
		}
	}
}
