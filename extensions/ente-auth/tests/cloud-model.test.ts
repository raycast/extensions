import { LocalStorage } from "@raycast/api";
import { finishSignIn, rejectSession, signOut, signInWithPassword } from "../src/cloud/auth";
import { TOTPModel } from "../src/cloud/model";
import { cacheKey, sessionKey } from "../src/cloud/storage";
import { STORAGE_KEY } from "../src/constants/secrets";
import { Secret } from "../src/helpers/types";
import { mockStorage } from "./storage";
import { defaultContext, fixture, mockFetch, PASSWORD, response } from "./fixtures";
import { DEFAULT_API_ORIGIN } from "../src/cloud/server";

describe("Get TOTP lifecycle", () => {
	let fetchMock: ReturnType<typeof mockFetch>;
	let items: ReturnType<typeof mockStorage>;
	let model: TOTPModel;
	beforeEach(() => {
		items = mockStorage();
		fetchMock = mockFetch();
		model = new TOTPModel();
	});
	afterEach(() => {
		model.dispose();
		jest.useRealTimers();
	});

	it("starts one sync per launch and never fetches on timer ticks", async () => {
		const { authorization, snapshot } = await fixture();
		fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({}));
		const { id } = await signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		await finishSignIn(defaultContext(id), authorization, PASSWORD);
		fetchMock.mockClear();
		fetchMock
			.mockResolvedValueOnce(response(snapshot.key))
			.mockResolvedValueOnce(response({ diff: snapshot.records }))
			.mockResolvedValueOnce(response({ diff: [] }));
		await model.start();
		await model.start();
		expect(model.state.entries).toHaveLength(1);
		expect(model.state.status).toBe("Up to date");
		expect(model.state).toMatchObject({ hasSession: true });
		const requests = fetchMock.mock.calls.length;
		const importReads = () =>
			(LocalStorage.getItem as jest.Mock).mock.calls.filter(([key]) => key === STORAGE_KEY).length;
		const reads = importReads();
		for (let tick = 0; tick < 10; tick++) {
			await model.tick();
		}

		expect(fetchMock).toHaveBeenCalledTimes(requests);
		expect(importReads()).toBe(reads);
	});

	async function withCache() {
		const data = await fixture();
		fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({}));
		const { id } = await signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		const session = await finishSignIn(defaultContext(id), data.authorization, PASSWORD);
		data.snapshot.sessionID = id;
		items.set(cacheKey(id), JSON.stringify(data.snapshot));
		return { ...data, session };
	}

	it("shows the saved custom server offline and clears it on sign-out and disposal", async () => {
		const { session, snapshot } = await withCache();
		const apiOrigin = "https://api.example.com";
		items.set(sessionKey(session.id), JSON.stringify({ ...session, apiOrigin }));
		items.set(cacheKey(session.id), JSON.stringify({ ...snapshot, apiOrigin }));
		fetchMock.mockReset().mockRejectedValue(new Error("offline"));
		await model.start();
		expect(model.state).toMatchObject({ apiOrigin, status: "Offline" });
		expect(model.state.entries).toHaveLength(1);
		expect(fetchMock.mock.calls[0][0]).toBe(apiOrigin + "/authenticator/key");
		await model.signOut();
		expect(model.state.apiOrigin).toBeUndefined();
		expect(fetchMock.mock.calls[1][0]).toBe(apiOrigin + "/users/logout");
		model.dispose();
		expect(model.state.apiOrigin).toBeUndefined();
	});

	it.each([
		[undefined, false],
		["[]", false],
		[" [ ] ", false],
		[JSON.stringify([{ secret: "legacy" }]), true],
		["damaged import data", true],
		["null", true],
	])("detects saved import data once on launch: %s", async (saved, hasImportedEntries) => {
		await withCache();
		if (saved !== undefined) items.set(STORAGE_KEY, saved);
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await model.start();
		expect(model.state).toMatchObject({ hasImportedEntries, status: "Offline" });
	});

	it("removes imported entries without changing cloud codes, keys, cache, or starting sync", async () => {
		const { session } = await withCache();
		items.set(STORAGE_KEY, JSON.stringify([{ secret: "legacy" }]));
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await model.start();
		const entries = model.state.entries;
		const cache = items.get(cacheKey(session.id));
		const requests = fetchMock.mock.calls.length;
		await model.removeImportedEntries();
		expect(model.state).toMatchObject({ hasImportedEntries: false, hasSession: true, entries });
		expect(items.has(STORAGE_KEY)).toBe(false);
		expect(items.has(sessionKey(session.id))).toBe(true);
		expect(items.get(cacheKey(session.id))).toBe(cache);
		expect(fetchMock).toHaveBeenCalledTimes(requests);
	});

	it("keeps the import flag if removal fails", async () => {
		await withCache();
		items.set(STORAGE_KEY, JSON.stringify([{ secret: "legacy" }]));
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await model.start();
		(LocalStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error("storage unavailable"));
		await expect(model.removeImportedEntries()).rejects.toThrow();
		expect(model.state.hasImportedEntries).toBe(true);
	});

	it("does not block cloud codes if the import check fails", async () => {
		await withCache();
		const getItem = LocalStorage.getItem as jest.Mock;
		const read = getItem.getMockImplementation()!;
		getItem.mockImplementation(async (key: string) => {
			if (key === STORAGE_KEY) throw new Error("import storage unavailable");
			return read(key);
		});
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await model.start();
		expect(model.state).toMatchObject({ hasImportedEntries: false, status: "Offline" });
		expect(model.state.entries).toHaveLength(1);
	});

	it("shows cached entries before sync ends and preserves them when offline", async () => {
		const { snapshot } = await withCache();
		const seen: string[] = [];
		model = new TOTPModel((state) => {
			if (state.entries.length) {
				seen.push(state.status);
			}
		});
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await model.start();
		expect(seen).toContain("Syncing");
		expect(model.state).toMatchObject({
			status: "Offline",
			lastSyncedAt: snapshot.syncedAt,
			hasSession: true,
		});
		expect(model.state.entries).toHaveLength(1);
	});

	it("shows a connection error and Retry when there is no cache", async () => {
		const { session } = await withCache();
		items.delete(cacheKey(session.id));
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await model.start();
		expect(model.state.status).toBe("Offline");
		expect(model.state.error).toContain("connection");
		expect(model.state.entries).toEqual([]);
		fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({ diff: [] }));
		await model.refresh();
		expect(model.state.status).toBe("Up to date");
	});

	it("hides cached codes and clears a rejected session without automatic retries", async () => {
		const { session } = await withCache();
		fetchMock.mockResolvedValueOnce(response({}, 401));
		await model.start();
		expect(model.state.status).toBe("Sign-in required");
		expect(model.state).toMatchObject({ hasSession: false });
		expect(model.state.entries).toEqual([]);
		expect(items.has(sessionKey(session.id))).toBe(false);
		const requests = fetchMock.mock.calls.length;
		await model.refresh();
		await model.tick();
		expect(fetchMock).toHaveBeenCalledTimes(requests);
	});

	it("does not read another account's cache", async () => {
		const { session, snapshot } = await withCache();
		const saved = JSON.stringify({ ...snapshot, userID: session.userID + 1 });
		items.set(cacheKey(session.id), saved);
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await model.start();
		expect(model.state.entries).toEqual([]);
		expect(items.get(cacheKey(session.id))).toBe(saved);
	});

	it("does no cloud work without a session or in import mode", async () => {
		expect(model.state).toMatchObject({ hasSession: false });
		await model.start();
		expect(model.state.status).toBe("Sign-in required");
		expect(model.state).toMatchObject({ hasSession: false });
		expect(fetchMock).not.toHaveBeenCalled();
		model.dispose();
		const entry: Secret = {
			issuer: "Legacy",
			username: "test",
			secret: "JBSWY3DPEHPK3PXP",
			algorithm: "SHA1",
			digits: 6,
			period: "30",
			tags: [],
			notes: "",
		};
		items.set(STORAGE_KEY, JSON.stringify([entry]));
		model = new TOTPModel();
		await model.start();
		expect(model.state).toMatchObject({ mode: "import", entries: [entry], hasSession: false });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("detects sign-out from another command using only local timer reads", async () => {
		await withCache();
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await model.start();
		expect(model.state.entries).toHaveLength(1);
		fetchMock.mockResolvedValueOnce(response({}));
		await signOut();
		const requests = fetchMock.mock.calls.length;
		await model.tick();
		expect(model.state.entries).toEqual([]);
		expect(fetchMock).toHaveBeenCalledTimes(requests);
	});

	it("hides codes when another command removes a rejected token without changing the mode", async () => {
		const { session } = await withCache();
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await model.start();
		await rejectSession(session);
		const requests = fetchMock.mock.calls.length;
		await model.tick();
		expect(model.state).toMatchObject({ entries: [], status: "Sign-in required", hasSession: false });
		expect(fetchMock).toHaveBeenCalledTimes(requests);
	});

	it("does not restore entries or notify after the command closes", async () => {
		await withCache();
		let release!: (value: Response) => void;
		fetchMock.mockImplementationOnce(
			() =>
				new Promise<Response>((resolve) => {
					release = resolve;
				})
		);
		const notify = jest.fn();
		model = new TOTPModel(notify);
		const pending = model.start();
		for (let tick = 0; tick < 100 && !release; tick++) {
			await Promise.resolve();
		}

		expect(release).toBeDefined();
		model.dispose();
		notify.mockClear();
		release(response({}, 404));
		await pending;
		expect(model.state.entries).toEqual([]);
		expect(notify).not.toHaveBeenCalled();
		expect(model.state).toMatchObject({ hasSession: false });
	});

	it("runs a local one-second timer with no repeated network sync", async () => {
		await withCache();
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		jest.useFakeTimers();
		await model.start();
		const requests = fetchMock.mock.calls.length;
		await jest.advanceTimersByTimeAsync(10_000);
		expect(fetchMock).toHaveBeenCalledTimes(requests);
	});

	it("clears in-memory entries and saved keys on an explicit sign-out", async () => {
		const { session } = await withCache();
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await model.start();
		fetchMock.mockResolvedValueOnce(response({}));
		await model.signOut();
		expect(model.state).toMatchObject({ entries: [], status: "Sign-in required", hasSession: false });
		expect(items.has(sessionKey(session.id))).toBe(false);
		expect(items.has(cacheKey(session.id))).toBe(false);
	});

	it("does not offer a signed-in account state when saved credentials cannot be read", async () => {
		const { session } = await withCache();
		items.set(sessionKey(session.id), "invalid JSON");
		fetchMock.mockClear();
		await model.start();
		expect(model.state).toMatchObject({ status: "Sync failed", hasSession: false });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("offers sign-out while the first sync is pending without a cache", async () => {
		const { session } = await withCache();
		items.delete(cacheKey(session.id));
		let release!: (value: Response) => void;
		fetchMock.mockImplementationOnce(
			() =>
				new Promise<Response>((resolve) => {
					release = resolve;
				})
		);
		const pending = model.start();
		for (let tick = 0; tick < 100 && !release; tick++) {
			await Promise.resolve();
		}

		expect(release).toBeDefined();
		expect(model.state).toMatchObject({ status: "Syncing", hasSession: true });
		fetchMock.mockResolvedValueOnce(response({}));
		await model.signOut();
		expect(model.state).toMatchObject({ status: "Sign-in required", hasSession: false });
		release(response({}, 404));
		await pending;
		expect(model.state).toMatchObject({ entries: [], hasSession: false });
	});
});
