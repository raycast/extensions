import { environment } from "@raycast/api";

/**
 *
 * Log data to the console only in development mode.
 */
export const debug = (...data: unknown[]) => {
	if (!environment.isDevelopment) return;
	console.debug(...data);
};

/**
 *
 * Log data inside a tap
 */
export const logData = <T>(data: T) => {
	debug(data);
	return data;
};
