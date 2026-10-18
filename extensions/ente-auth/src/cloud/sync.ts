import { Secret } from "../helpers/types";
import { saveCache } from "./cache";
import { request } from "./client";
import { decryptSnapshot } from "./crypto";
import { CloudError, invalidData } from "./errors";
import { assertCurrent } from "./storage";
import { EncryptedRecord, Session, Snapshot } from "./types";
import { object, readKey, readRecord } from "./validation";

const PAGE_SIZE = 5000;
const MAX_PAGES = 1000;
const MAX_RECORDS = 200_000;

export async function syncSession(
	session: Session,
	signal?: AbortSignal
): Promise<{ snapshot: Snapshot; entries: Secret[] }> {
	await assertCurrent(session.id, signal, true);

	const remoteKey = await request("/authenticator/key", { session, signal, allowNotFound: true });
	const key = remoteKey === null ? null : readKey(remoteKey);
	if (key && key.userID !== session.userID) {
		throw invalidData();
	}

	const records = await downloadRecords(session, signal);
	if (!key && records.length) {
		throw invalidData();
	}

	const snapshot: Snapshot = {
		apiOrigin: session.apiOrigin,
		sessionID: session.id,
		userID: session.userID,
		key,
		records,
		syncedAt: Date.now(),
	};

	// Decrypt the complete snapshot before replacing a working cache.
	const entries = await decryptSnapshot(snapshot, session);
	await saveCache(session, snapshot, signal);

	return { snapshot, entries };
}

async function downloadRecords(session: Session, signal?: AbortSignal) {
	const records = new Map<string, EncryptedRecord>();
	let sinceTime = 0;

	for (let pageIndex = 0; ; pageIndex++) {
		if (pageIndex >= MAX_PAGES || records.size > MAX_RECORDS) {
			throw new CloudError("invalid", "The sync is too large. The saved cache was not changed.");
		}

		await assertCurrent(session.id, signal, true);

		const page = await fetchPage(session, sinceTime, signal);

		if (page.length === 0) {
			break;
		}

		const latestTime = mergePage(records, page, sinceTime);
		sinceTime = nextPageTime(page.length, latestTime, sinceTime);
	}

	return [...records.values()].filter((record) => !record.isDeleted);
}

async function fetchPage(
	session: Session,
	sinceTime: number,
	signal?: AbortSignal
): Promise<EncryptedRecord[]> {
	const query = new URLSearchParams({ sinceTime: String(sinceTime), limit: String(PAGE_SIZE) });
	const value = object(await request(`/authenticator/entity/diff?${query}`, { session, signal }));
	if (!Array.isArray(value.diff) || value.diff.length > PAGE_SIZE) {
		throw invalidData();
	}

	return value.diff.map((raw: unknown) => {
		const data = object(raw);
		if (data.userID !== undefined && data.userID !== session.userID) {
			throw invalidData();
		}

		return readRecord(data);
	});
}

function mergePage(
	records: Map<string, EncryptedRecord>,
	page: EncryptedRecord[],
	sinceTime: number
): number {
	let latestTime = sinceTime;

	for (const record of page) {
		if (record.updatedAt <= sinceTime || record.updatedAt < latestTime) {
			throw invalidData();
		}

		const previous = records.get(record.id);
		if (previous?.updatedAt === record.updatedAt && JSON.stringify(previous) !== JSON.stringify(record)) {
			throw invalidData();
		}

		records.set(record.id, record);
		latestTime = record.updatedAt;
	}

	return latestTime;
}

function nextPageTime(pageSize: number, latestTime: number, sinceTime: number): number {
	// Repeat the last timestamp on a full page so tied records are not lost.
	const nextTime = pageSize === PAGE_SIZE ? latestTime - 1 : latestTime;
	if (nextTime <= sinceTime) {
		throw new CloudError(
			"invalid",
			"The Ente page boundary could not be read safely. The saved cache was not changed. Try again."
		);
	}

	return nextTime;
}
