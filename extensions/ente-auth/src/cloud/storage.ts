import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { STORAGE_KEY } from "../constants/secrets";
import { CloudError, invalidData } from "./errors";
import { Session } from "./types";
import { readAPIOrigin } from "./server";
import { integer, storedObject, text } from "./validation";

const MODE_KEY = "ente-auth.mode";
const CLOUD_PREFIX = "ente-auth.cloud.";
export const sessionKey = (id: string) => `${CLOUD_PREFIX}session.${id}`;
export const cacheKey = (id: string) => `${CLOUD_PREFIX}cache.${id}`;

export interface ModeState {
	mode: "cloud" | "import";
	revision: string;
}

export async function hasImportedEntries(): Promise<boolean> {
	const saved = await LocalStorage.getItem<string>(STORAGE_KEY);
	if (!saved) {
		return false;
	}

	try {
		const entries: unknown = JSON.parse(saved);
		return !Array.isArray(entries) || entries.length > 0;
	} catch {
		// Damaged import data must still be available for explicit removal.
		return true;
	}
}

export async function getMode(): Promise<ModeState> {
	const saved = await LocalStorage.getItem<string>(MODE_KEY);
	if (saved) {
		const state = storedObject(JSON.parse(saved));
		if (state.mode !== "cloud" && state.mode !== "import") {
			throw invalidData();
		}

		return { mode: state.mode, revision: text(state.revision) };
	}

	const imported = await LocalStorage.getItem<string>(STORAGE_KEY);

	return {
		mode: imported && JSON.parse(imported).length ? "import" : "cloud",
		revision: "initial",
	};
}

export async function changeMode(
	mode: "cloud" | "import",
	expectedRevision?: string,
	signal?: AbortSignal
): Promise<ModeState> {
	const state: ModeState = { mode, revision: randomUUID() };
	const items = await LocalStorage.allItems();
	const current = expectedRevision === undefined ? undefined : await getMode();
	if (signal?.aborted || (current && current.revision !== expectedRevision)) {
		throw new CloudError("cancelled", "The account changed. Open Get TOTP again.");
	}

	// Invalidate work before removing keys. Commands run in separate processes.
	await LocalStorage.setItem(MODE_KEY, JSON.stringify(state));

	await Promise.all(
		Object.keys(items)
			.filter((key) => key.startsWith(CLOUD_PREFIX))
			.map((key) => LocalStorage.removeItem(key))
	);

	return state;
}

export async function assertCurrent(id: string, signal?: AbortSignal, requireSession = false): Promise<void> {
	const state = await getMode();
	if (
		signal?.aborted ||
		state.mode !== "cloud" ||
		state.revision !== id ||
		(requireSession && !(await LocalStorage.getItem(sessionKey(id))))
	) {
		throw new CloudError("cancelled", "The account changed. Open Get TOTP again.");
	}
}

export async function getSession(): Promise<Session | null> {
	const state = await getMode();
	if (state.mode !== "cloud") {
		return null;
	}

	const saved = await LocalStorage.getItem<string>(sessionKey(state.revision));
	if (!saved) {
		return null;
	}

	const value = storedObject(JSON.parse(saved));
	if (value.id !== state.revision) {
		throw invalidData();
	}

	return {
		apiOrigin: readAPIOrigin(value.apiOrigin),
		id: text(value.id),
		userID: integer(value.userID, 1),
		token: text(value.token),
		masterKey: text(value.masterKey),
	};
}

export async function writeCurrent(
	id: string,
	key: string,
	value: unknown,
	signal?: AbortSignal
): Promise<void> {
	const requireSession = key === cacheKey(id);
	await assertCurrent(id, signal, requireSession);

	await LocalStorage.setItem(key, JSON.stringify(value));

	try {
		// A sign-out can run between the check and write. Remove a late write.
		await assertCurrent(id, undefined, requireSession);
	} catch (error) {
		await LocalStorage.removeItem(key);
		throw error;
	}
}
