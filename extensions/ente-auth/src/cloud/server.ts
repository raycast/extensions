import { CloudError, invalidData } from "./errors";

export const DEFAULT_API_ORIGIN = "https://api.ente.com";

export function normalizeAPIOrigin(value: string): string {
	const fail = () =>
		new CloudError(
			"verification",
			"Enter an API server origin, such as https://api.example.com. Do not include a path, query, or fragment."
		);
	if (
		typeof value !== "string" ||
		value.includes("\\") ||
		[...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
	) {
		throw fail();
	}
	const input = value.trim();
	const parts = /^(https?):\/\/([^/?#]+)(\/?)$/i.exec(input);
	if (!parts || /\s|@/.test(input)) {
		throw fail();
	}
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		throw fail();
	}
	if (url.protocol === "http:") {
		const host = parts[2].replace(/:\d+$/, "").toLowerCase();
		if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || host !== url.hostname) {
			throw new CloudError(
				"verification",
				"Remote API servers require HTTPS. HTTP is permitted only for localhost, 127.0.0.1, or [::1]."
			);
		}
	}
	return url.origin;
}

export function readAPIOrigin(value: unknown): string {
	if (typeof value !== "string") {
		throw invalidData();
	}
	try {
		if (normalizeAPIOrigin(value) === value) {
			return value;
		}
	} catch {
		throw invalidData();
	}
	throw invalidData();
}
