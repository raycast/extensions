import { LocalStorage } from "@raycast/api";
import { loadCache, readSnapshot } from "../src/cloud/cache";
import { decryptSnapshot } from "../src/cloud/crypto";
import { getMode, getSession, sessionKey, cacheKey } from "../src/cloud/storage";
import { signOut } from "../src/cloud/auth";
import { DEFAULT_API_ORIGIN } from "../src/cloud/server";
import { fixture, mockFetch } from "./fixtures";
import { mockStorage } from "./storage";

describe("server-bound storage", () => {
	let items: ReturnType<typeof mockStorage>;
	beforeEach(() => {
		items = mockStorage();
		mockFetch();
	});
	async function save(apiOrigin = DEFAULT_API_ORIGIN) {
		const data = await fixture();
		const { revision } = await getMode();
		data.session = { ...data.session, id: revision, apiOrigin };
		data.snapshot = { ...data.snapshot, sessionID: revision, apiOrigin };
		items.set(sessionKey(data.session.id), JSON.stringify(data.session));
		items.set(cacheKey(data.session.id), JSON.stringify(data.snapshot));
		return data;
	}
	it.each([DEFAULT_API_ORIGIN, "https://api.example.com"])(
		"reads sessions and encrypted caches on %s without requests or writes",
		async (apiOrigin) => {
			const { session, snapshot } = await save(apiOrigin);
			const before = [...items];
			expect(await getSession()).toEqual(session);
			const cache = await loadCache(session);
			expect(cache).toEqual(snapshot);
			expect(await decryptSnapshot(cache!, session)).toHaveLength(1);
			expect([...items]).toEqual(before);
			expect(LocalStorage.setItem).not.toHaveBeenCalled();
			expect(global.fetch).not.toHaveBeenCalled();
		}
	);
	it.each([
		undefined,
		null,
		"",
		"http://remote.example.com",
		"https://api.ente.com/",
		"https://api.ente.com?",
		"https://api.ente.com/path",
	])("rejects an invalid session origin %s and still signs out locally", async (apiOrigin) => {
		const { session } = await save();
		items.set(sessionKey(session.id), JSON.stringify({ ...session, apiOrigin }));
		await expect(getSession()).rejects.toBeDefined();
		expect(LocalStorage.setItem).not.toHaveBeenCalled();
		await signOut();
		expect(await getSession()).toBeNull();
		expect(global.fetch).not.toHaveBeenCalled();
		expect(items.has(cacheKey(session.id))).toBe(false);
	});
	it.each([
		undefined,
		null,
		"",
		"http://remote.example.com",
		"https://api.ente.com/",
		"https://api.ente.com?",
	])("rejects an invalid cache origin %s before decryption without writes", async (apiOrigin) => {
		const { session, snapshot } = await save();
		const saved = { ...snapshot, apiOrigin };
		items.set(cacheKey(session.id), JSON.stringify(saved));
		await expect(loadCache(session)).rejects.toMatchObject({ kind: "invalid" });
		Object.assign(snapshot, { apiOrigin });
		await expect(decryptSnapshot(snapshot, session)).rejects.toMatchObject({ kind: "invalid" });
		expect(LocalStorage.setItem).not.toHaveBeenCalled();
		expect(global.fetch).not.toHaveBeenCalled();
	});
	it("rejects a different server with equal IDs and keys at both cache checks", async () => {
		const { session, snapshot } = await save();
		const other = { ...session, apiOrigin: "https://other.example.com" };
		expect(() => readSnapshot(snapshot, other)).toThrow();
		await expect(decryptSnapshot(snapshot, other)).rejects.toBeDefined();
	});
});
