import { LocalStorage } from "@raycast/api";
import { CloudError, invalidData } from "./errors";
import { assertCurrent, cacheKey, writeCurrent } from "./storage";
import { Session, Snapshot } from "./types";
import { readAPIOrigin } from "./server";
import { integer, storedObject, readKey, readRecord, text } from "./validation";

export function readSnapshot(value: unknown, session: Session): Snapshot {
	const saved = storedObject(value);

	const apiOrigin = readAPIOrigin(saved.apiOrigin);
	if (
		apiOrigin !== session.apiOrigin ||
		saved.userID !== session.userID ||
		saved.sessionID !== session.id ||
		!Array.isArray(saved.records)
	) {
		throw invalidData();
	}

	return {
		apiOrigin,
		sessionID: text(saved.sessionID),
		userID: integer(saved.userID, 1),
		key: saved.key === null ? null : readKey(saved.key),
		records: saved.records.map(readRecord),
		syncedAt: integer(saved.syncedAt, 1),
	};
}

export async function loadCache(session: Session, signal?: AbortSignal): Promise<Snapshot | null> {
	await assertCurrent(session.id, signal, true);

	const raw = await LocalStorage.getItem<string>(cacheKey(session.id));
	if (!raw) {
		return null;
	}

	try {
		return readSnapshot(JSON.parse(raw), session);
	} catch (error) {
		if (error instanceof CloudError) {
			throw error;
		}

		throw invalidData();
	}
}

export async function saveCache(session: Session, snapshot: Snapshot, signal?: AbortSignal): Promise<void> {
	await writeCurrent(session.id, cacheKey(session.id), snapshot, signal);
}
