import { type ChildProcess, exec } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import type {
	TrackedWindow,
	TrackingMode,
	WorkspaceItem,
} from "../../../types/workspace";
import { delay } from "../../utils/delay";
import type { BeforeLaunchState, ItemLaunchStrategy } from "./base-strategy";

const execAsync = promisify(exec);

// ============================================================================
// Constants
// ============================================================================

const TIMEOUTS = {
	WINDOW_ID_QUERY: 2000, // Max time to wait for window ID query
	WINDOW_TITLE_QUERY: 1000, // Max time to wait for window title
	APP_LAUNCH_POLL: 1500, // Max time to poll for app launch
	APP_LAUNCH_POLL_INTERVAL: 100, // Poll interval when waiting for app
	WINDOW_CREATION_DELAY: 300, // Extra delay after app detected for window creation
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Executes a shell command with a timeout.
 * Returns empty string on timeout or error (fail-safe for AppleScript queries).
 */
function execWithTimeout(command: string, timeoutMs: number): Promise<string> {
	return new Promise((resolve) => {
		let resolved = false;
		let childProcess: ChildProcess | null = null;

		const timer = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				childProcess?.kill("SIGKILL");
				resolve("");
			}
		}, timeoutMs);

		childProcess = exec(command, (error, stdout) => {
			if (!resolved) {
				resolved = true;
				clearTimeout(timer);
				resolve(error ? "" : stdout);
			}
		});
	});
}

/**
 * Escapes single quotes for shell command embedding.
 */
function escapeForShell(str: string): string {
	return str.replace(/'/g, "'\\''");
}

/**
 * Validates that appName contains only safe characters (alphanumerics, spaces, dashes, underscores, dots).
 * @throws Error if appName contains unsafe characters
 */
function validateAppName(appName: string): void {
	if (!/^[\w\s\-.]+$/.test(appName)) {
		throw new Error(
			`Unsafe app name: "${appName}". App name must contain only alphanumerics, spaces, dashes, underscores, and dots.`,
		);
	}
}

/**
 * Validates that path is a safe string for shell commands.
 * Paths should start with / or ~, and not contain dangerous patterns.
 * @throws Error if path contains potentially dangerous characters
 */
function validatePath(path: string): void {
	// Check for absolute paths or home directory paths
	if (!path.startsWith("/") && !path.startsWith("~") && !path.startsWith(".")) {
		throw new Error(
			`Invalid path: "${path}". Path must be absolute or start with ~`,
		);
	}

	// Check for dangerous patterns (backticks, semicolons, pipes, etc.)
	if (/[`$;|&><]/.test(path)) {
		throw new Error(
			`Unsafe path: "${path}". Path contains potentially dangerous shell characters.`,
		);
	}
}

/**
 * Validates that windowId is a finite number.
 * @throws Error if windowId is not a finite number
 */
function validateWindowId(windowId: number): void {
	if (!Number.isFinite(windowId)) {
		throw new Error(
			`Invalid window ID: ${windowId}. Window ID must be a finite number.`,
		);
	}
}

/**
 * Runs an AppleScript with timeout protection.
 */
function runAppleScript(script: string, timeoutMs: number): Promise<string> {
	return execWithTimeout(`osascript -e '${escapeForShell(script)}'`, timeoutMs);
}

// ============================================================================
// AppleScript Builders
// ============================================================================

const AppleScripts = {
	/** Get all window IDs for an app */
	getWindowIds: (appName: string) => {
		validateAppName(appName);
		return `tell application "${appName}"
  if (count of windows) > 0 then
    get id of every window
  else
    return ""
  end if
end tell`;
	},

	/** Get title of a specific window by ID */
	getWindowTitle: (appName: string, windowId: number) => {
		validateAppName(appName);
		validateWindowId(windowId);
		return `tell application "${appName}"
  repeat with w in windows
    if id of w is ${windowId} then
      return name of w
    end if
  end repeat
end tell`;
	},

	/** Quit an application gracefully */
	quitApp: (appName: string) => {
		validateAppName(appName);
		return `tell application "${appName}" to quit`;
	},

	/** Close a specific window using System Events (UI scripting) */
	closeWindowViaSystemEvents: (appName: string, windowId: number) => {
		validateAppName(appName);
		validateWindowId(windowId);
		return `tell application "System Events"
  if exists process "${appName}" then
    tell process "${appName}"
      set windowList to every window
      repeat with w in windowList
        if id of w is ${windowId} then
          click button 1 of w
          return
        end if
      end repeat
    end tell
  end if
end tell`;
	},

	/** Close a specific window via direct app command */
	closeWindowViaApp: (appName: string, windowId: number) => {
		validateAppName(appName);
		validateWindowId(windowId);
		return `tell application "${appName}"
  set windowList to every window
  repeat with w in windowList
    if id of w is ${windowId} then
      close w
      return
    end if
  end repeat
end tell`;
	},
};

// ============================================================================
// AppLauncher Class
// ============================================================================

export class AppLauncher implements ItemLaunchStrategy {
	// --------------------------------------------------------------------------
	// Private Helpers
	// --------------------------------------------------------------------------

	/** Extract app name from full path (e.g., "/Applications/Slack.app" → "Slack") */
	private getAppName(item: WorkspaceItem): string {
		const appName = item.path
			.replace(/\.app$/, "")
			.split("/")
			.pop();
		if (!appName) {
			throw new Error("Could not extract app name from path");
		}
		return appName;
	}

	/** Check if app is running using pgrep (fast, no AppleScript overhead) */
	private async isAppRunning(appName: string): Promise<boolean> {
		validateAppName(appName);
		try {
			const { stdout } = await execAsync(
				`pgrep -x '${escapeForShell(appName)}' 2>/dev/null || true`,
			);
			return stdout.trim().length > 0;
		} catch {
			return false;
		}
	}

	/** Get window IDs for an app (with timeout protection) */
	private async getWindowIds(appName: string): Promise<number[]> {
		const stdout = await runAppleScript(
			AppleScripts.getWindowIds(appName),
			TIMEOUTS.WINDOW_ID_QUERY,
		);

		if (!stdout.trim()) return [];

		const ids = stdout
			.trim()
			.split(",")
			.map((s) => Number.parseInt(s.trim(), 10))
			.filter((id) => !Number.isNaN(id));

		if (ids.length > 0) {
			console.log(`  Found ${ids.length} windows for ${appName}`);
		}
		return ids;
	}

	/** Get window title by ID (with timeout protection) */
	private async getWindowTitle(
		appName: string,
		windowId: number,
	): Promise<string | undefined> {
		const stdout = await runAppleScript(
			AppleScripts.getWindowTitle(appName, windowId),
			TIMEOUTS.WINDOW_TITLE_QUERY,
		);
		return stdout.trim() || undefined;
	}

	/** Poll until app is running or timeout */
	private async waitForAppToLaunch(appName: string): Promise<void> {
		const maxAttempts = Math.ceil(
			TIMEOUTS.APP_LAUNCH_POLL / TIMEOUTS.APP_LAUNCH_POLL_INTERVAL,
		);

		for (let i = 0; i < maxAttempts; i++) {
			if (await this.isAppRunning(appName)) {
				await delay(TIMEOUTS.WINDOW_CREATION_DELAY);
				return;
			}
			await delay(TIMEOUTS.APP_LAUNCH_POLL_INTERVAL);
		}
	}

	/** Create a TrackedWindow object */
	private createTrackedWindow(
		item: WorkspaceItem,
		appName: string,
		trackingMode: TrackingMode,
		systemWindowId: number,
		windowTitle?: string,
	): TrackedWindow {
		return {
			id: randomUUID(),
			systemWindowId,
			itemId: item.id,
			appName,
			windowTitle: windowTitle ?? appName,
			type: item.type,
			trackingMode,
			launchedAt: Date.now(),
		};
	}

	/**
	 * Phase 1: Capture state before launching (fast - uses pgrep + timeout-protected AppleScript)
	 */
	async captureBeforeState(item: WorkspaceItem): Promise<BeforeLaunchState> {
		const appName = this.getAppName(item);
		const [wasRunning, windowIdsBefore] = await Promise.all([
			this.isAppRunning(appName),
			this.getWindowIds(appName),
		]);
		console.log(
			`[${appName}] Before: running=${wasRunning}, windows=${windowIdsBefore.join(",") || "none"}`,
		);
		return { item, wasRunning, windowIdsBefore, appName };
	}

	/**
	 * Phase 2: Launch the app (fast - just executes open command)
	 */
	async launchOnly(item: WorkspaceItem): Promise<void> {
		const appName = this.getAppName(item);
		validateAppName(appName);
		validatePath(item.path);
		console.log(`[${appName}] Launching...`);
		await execAsync(`open -a '${escapeForShell(item.path)}'`);
	}

	/**
	 * Phase 3: Capture state after launching and determine tracking mode
	 */
	async captureAfterState(
		beforeState: BeforeLaunchState,
	): Promise<TrackedWindow[]> {
		const { item, wasRunning, windowIdsBefore, appName } = beforeState;

		// Wait for app to be ready
		if (!wasRunning) {
			await this.waitForAppToLaunch(appName);
		} else {
			await delay(TIMEOUTS.WINDOW_CREATION_DELAY);
		}

		// Get windows after launch
		const afterIds = await this.getWindowIds(appName);
		const newWindowIds = afterIds.filter((id) => !windowIdsBefore.includes(id));
		console.log(
			`[${appName}] After: windows=${afterIds.join(",") || "none"}, new=${newWindowIds.length}`,
		);

		// Determine tracking mode based on what we found
		if (newWindowIds.length > 0) {
			// Window-level tracking: we can track individual windows
			console.log(`[${appName}] Using WINDOW-LEVEL tracking`);
			const titles = await Promise.all(
				newWindowIds.map((id) => this.getWindowTitle(appName, id)),
			);
			return newWindowIds.map((windowId, i) =>
				this.createTrackedWindow(item, appName, "window", windowId, titles[i]),
			);
		}

		if (!wasRunning) {
			// App-level tracking: app wasn't running before, track the whole app
			console.log(`[${appName}] Using APP-LEVEL tracking`);
			return [this.createTrackedWindow(item, appName, "app", 0)];
		}

		// App was already running and we can't identify new windows
		console.log(`[${appName}] Already running - skipping tracking`);
		return [];
	}

	/**
	 * Standard launch method (captures before, launches, captures after)
	 * Used for non-parallel launches or when phased launching isn't needed
	 */
	async launch(item: WorkspaceItem): Promise<TrackedWindow[]> {
		try {
			const beforeState = await this.captureBeforeState(item);
			await this.launchOnly(item);
			return await this.captureAfterState(beforeState);
		} catch (error) {
			throw new Error(
				`Failed to launch ${item.name}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async close(windows: TrackedWindow[]): Promise<void> {
		for (const window of windows) {
			try {
				if (window.trackingMode === "app") {
					await this.closeApp(window.appName);
				} else {
					await this.closeWindow(window.appName, window.systemWindowId);
				}
			} catch (error) {
				const target = window.trackingMode === "app" ? "app" : "window";
				console.error(`Failed to close ${target} ${window.appName}:`, error);
			}
		}
	}

	/** Quit an entire application */
	private async closeApp(appName: string): Promise<void> {
		validateAppName(appName);
		console.log(`Quitting ${appName} (app-level)`);
		try {
			await runAppleScript(AppleScripts.quitApp(appName), 2000);
		} catch {
			// Fallback: try to kill individual PIDs for the app
			await this.forceQuitApp(appName);
		}
	}

	/** Get all PIDs for a given app name using pgrep */
	private async getAppPIDs(appName: string): Promise<number[]> {
		validateAppName(appName);
		try {
			const { stdout } = await execAsync(
				`pgrep -x '${escapeForShell(appName)}' 2>/dev/null || true`,
			);
			// stdout may contain multiple PIDs separated by newlines
			return stdout
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
				.map((line) => Number(line))
				.filter((pid) => !Number.isNaN(pid));
		} catch (e) {
			// pgrep returns non-zero exit code if no process found
			return [];
		}
	}

	/** Force quit an app by killing its PIDs */
	private async forceQuitApp(appName: string): Promise<void> {
		const pids = await this.getAppPIDs(appName);
		if (pids.length === 0) {
			console.warn(
				`No running processes found for "${appName}" to force quit.`,
			);
			return;
		}

		if (pids.length > 1) {
			console.warn(
				`Multiple (${pids.length}) processes found for "${appName}". All will be killed. This may affect other running instances.`,
			);
		}

		for (const pid of pids) {
			// Validate PID is a positive integer
			if (!Number.isInteger(pid) || pid <= 0) {
				console.warn(`Invalid PID ${pid} for "${appName}", skipping`);
				continue;
			}
			try {
				await execAsync(`kill ${pid}`);
			} catch (e) {
				console.error(`Failed to kill PID ${pid} for "${appName}":`, e);
			}
		}
	}

	/** Close a specific window by ID */
	private async closeWindow(appName: string, windowId: number): Promise<void> {
		console.log(`Closing window ${windowId} of ${appName}`);

		// Try System Events first (UI scripting)
		try {
			await runAppleScript(
				AppleScripts.closeWindowViaSystemEvents(appName, windowId),
				2000,
			);
			return;
		} catch {
			// Fall through to direct app method
		}

		// Fallback: direct app close command
		await runAppleScript(
			AppleScripts.closeWindowViaApp(appName, windowId),
			2000,
		);
	}

	async verifyWindows(windows: TrackedWindow[]): Promise<TrackedWindow[]> {
		// Group windows by app for efficient batch verification
		const windowsByApp = this.groupByApp(windows);
		const verified: TrackedWindow[] = [];

		for (const [appName, appWindows] of windowsByApp) {
			try {
				const isRunning = await this.isAppRunning(appName);
				if (!isRunning) continue;

				// App-level: valid if app is running
				const appLevel = appWindows.filter((w) => w.trackingMode === "app");
				verified.push(...appLevel);

				// Window-level: valid if specific window ID still exists
				const windowLevel = appWindows.filter(
					(w) => w.trackingMode === "window",
				);
				if (windowLevel.length > 0) {
					const currentIds = await this.getWindowIds(appName);
					const stillExists = windowLevel.filter((w) =>
						currentIds.includes(w.systemWindowId),
					);
					verified.push(...stillExists);
				}
			} catch (error) {
				console.error(`Error verifying windows for ${appName}:`, error);
			}
		}

		return verified;
	}

	/** Group windows by app name */
	private groupByApp(windows: TrackedWindow[]): Map<string, TrackedWindow[]> {
		const map = new Map<string, TrackedWindow[]>();
		for (const window of windows) {
			const group = map.get(window.appName) || [];
			group.push(window);
			map.set(window.appName, group);
		}
		return map;
	}
}
