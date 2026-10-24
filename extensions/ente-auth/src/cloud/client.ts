import { CloudError, invalidData } from "./errors";
import { Session } from "./types";
import { normalizeAPIOrigin } from "./server";

type RequestOptions = {
	body?: Record<string, unknown>;
	signal?: AbortSignal;
	allowNotFound?: boolean;
} & ({ session: Session; apiOrigin?: never } | { session?: never; apiOrigin: string });

export async function request(path: string, options: RequestOptions): Promise<unknown> {
	if (!options || (options.session && "apiOrigin" in options)) {
		throw invalidData();
	}
	const apiOrigin = normalizeAPIOrigin(options.session ? options.session.apiOrigin : options.apiOrigin);
	const isRootRelativePath = path.startsWith("/") && !path.startsWith("//");
	// Reject whitespace, backslashes, and control characters before URL parsing can change them.
	const hasUnsafeCharacters = [...path].some((character) => {
		const code = character.charCodeAt(0);
		const isControlCharacter = code < 32 || code === 127;
		return character === "\\" || character.trim() === "" || isControlCharacter;
	});
	if (!isRootRelativePath || hasUnsafeCharacters) {
		throw invalidData();
	}
	const url = new URL(path, apiOrigin);
	if (url.origin !== apiOrigin) {
		throw invalidData();
	}
	const timeout = AbortSignal.timeout(20_000);
	const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

	try {
		const response = await fetch(url.href, {
			method: options.body ? "POST" : "GET",
			headers: {
				"X-Client-Package": "io.ente.auth",
				"Content-Type": "application/json",
				...(options.session ? { "X-Auth-Token": options.session.token } : {}),
			},
			body: options.body ? JSON.stringify(options.body) : undefined,
			signal,
			redirect: "error",
		});

		if (response.status === 404 && options.allowNotFound) {
			return null;
		}

		if (response.status === 401) {
			if (options.session) {
				throw new CloudError("unauthorized", "Sign in to Ente again.");
			}

			throw new CloudError("verification", "Verification failed. Check your sign-in details and try again.");
		}

		if (response.status === 429) {
			throw new CloudError("verification", "Too many requests. Wait before you try again.");
		}

		if (response.status >= 500) {
			throw new CloudError("network", "Ente could not be reached. Try again.");
		}

		if (!response.ok) {
			throw new CloudError(
				"verification",
				"Ente rejected the request. Check your sign-in details and try again."
			);
		}

		// SendOTT (POST /users/ott) returns HTTP 200 with no body; the other used endpoints return JSON.
		const content = await response.text();
		if (!content && options.body) {
			return null;
		}

		try {
			return JSON.parse(content);
		} catch {
			throw invalidData();
		}
	} catch (error) {
		if (options.signal?.aborted) {
			throw new CloudError("cancelled", "The operation was cancelled.");
		}

		if (error instanceof CloudError) {
			throw error;
		}

		throw new CloudError("network", "Ente could not be reached. Check your connection and try again.");
	}
}
