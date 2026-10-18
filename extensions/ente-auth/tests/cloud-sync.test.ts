import { LocalStorage } from "@raycast/api";
import { finishSignIn, getSession, rejectSession, signOut, signInWithPassword } from "../src/cloud/auth";
import { cacheKey } from "../src/cloud/storage";
import { syncSession } from "../src/cloud/sync";
import { fixture, mockFetch, OTP_URI, PASSWORD, response } from "./fixtures";
import { mockStorage } from "./storage";
import { deferred } from "./deferred";

describe("encrypted cloud sync", () => {
	let items: ReturnType<typeof mockStorage>;
	let fetchMock: ReturnType<typeof mockFetch>;
	beforeEach(() => {
		items = mockStorage();
		fetchMock = mockFetch();
	});

	async function signedIn(apiOrigin = "https://api.example.com", uri = OTP_URI, tokenByte = 255) {
		const data = await fixture(0, uri, tokenByte);
		fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({}));
		const context = await signInWithPassword("a@example.com", PASSWORD, apiOrigin);
		const { id } = context;
		const session = await finishSignIn(context, data.authorization, PASSWORD);
		data.snapshot.sessionID = id;
		data.snapshot = { ...data.snapshot, apiOrigin };
		return { ...data, session };
	}

	it("confirms the terminal page, decrypts in memory, and saves encrypted records only", async () => {
		const { session, snapshot } = await signedIn();
		fetchMock
			.mockResolvedValueOnce(response(snapshot.key))
			.mockResolvedValueOnce(response({ diff: snapshot.records }))
			.mockResolvedValueOnce(response({ diff: [] }));
		const result = await syncSession(session);
		expect(result.snapshot.apiOrigin).toBe(session.apiOrigin);
		expect(fetchMock.mock.calls.every(([url]) => url.startsWith(session.apiOrigin + "/"))).toBe(true);
		expect(result.entries[0].issuer).toBe("Synthetic");
		const saved = items.get(cacheKey(session.id)) as string;
		expect(Object.keys(JSON.parse(saved)).sort()).toEqual([
			"apiOrigin",
			"key",
			"records",
			"sessionID",
			"syncedAt",
			"userID",
		]);
		expect(saved).toContain(snapshot.records[0].encryptedData);
		for (const forbidden of [
			"Synthetic",
			"test@example.com",
			"JBSWY3DPEHPK3PXP",
			"otpauth:",
			"current_totp",
		]) {
			expect(saved).not.toContain(forbidden);
		}

		expect(fetchMock.mock.calls.at(-1)[0]).toContain("sinceTime=10");
	});

	it.each([200, 401])(
		"keeps server B after server A returns late HTTP %s with the same account ID",
		async (status) => {
			const old = await signedIn("https://a.example.com");
			const held = deferred<Response>();
			fetchMock.mockImplementationOnce(() => held.promise);
			const pending = syncSession(old.session).catch(async (error) => {
				if (error.kind === "unauthorized") await rejectSession(old.session);
				return error;
			});
			for (let tick = 0; tick < 100 && fetchMock.mock.calls.length < 3; tick++) await Promise.resolve();
			expect(fetchMock.mock.calls[2][0]).toBe("https://a.example.com/authenticator/key");
			fetchMock.mockResolvedValueOnce(response({}));
			await signOut();
			expect(fetchMock.mock.calls[3][0]).toBe("https://a.example.com/users/logout");
			const next = await signedIn(
				"https://b.example.com",
				OTP_URI.replace("issuer=Synthetic", "issuer=ServerB"),
				254
			);
			expect(next.session.userID).toBe(old.session.userID);
			expect(next.session.token).not.toBe(old.session.token);
			fetchMock
				.mockResolvedValueOnce(response(next.snapshot.key))
				.mockResolvedValueOnce(response({ diff: next.snapshot.records }))
				.mockResolvedValueOnce(response({ diff: [] }));
			expect((await syncSession(next.session)).entries[0].issuer).toBe("ServerB");
			const cache = items.get(cacheKey(next.session.id));
			held.resolve(response(old.snapshot.key, status));
			expect((await pending).kind).toBe(status === 401 ? "unauthorized" : "cancelled");
			expect(await getSession()).toEqual(next.session);
			expect(items.get(cacheKey(next.session.id))).toBe(cache);
			expect(items.has(cacheKey(old.session.id))).toBe(false);
			for (const [url, options] of fetchMock.mock.calls.filter(([url]) =>
				url.startsWith("https://b.example.com/")
			)) {
				expect(url).not.toContain("a.example.com");
				expect(options.headers["X-Auth-Token"]).not.toBe(old.session.token);
				if (url.includes("/authenticator/")) expect(options.headers["X-Auth-Token"]).toBe(next.session.token);
			}
		}
	);

	it.each(["network", "partial", "corrupt", "wrong-account", "api-version"])(
		"keeps a valid cache after a %s failure",
		async (failure) => {
			const { session, snapshot } = await signedIn();
			const original = JSON.stringify(snapshot);
			items.set(cacheKey(session.id), original);
			if (failure === "wrong-account") {
				snapshot.key!.userID++;
			}

			if (failure === "corrupt") {
				snapshot.records[0].encryptedData = "bad";
			}

			fetchMock.mockResolvedValueOnce(response(snapshot.key));
			if (failure === "network") {
				fetchMock.mockRejectedValueOnce(new Error("private network detail"));
			} else if (failure === "partial") {
				fetchMock.mockResolvedValueOnce(response({}));
			} else if (failure === "api-version") {
				fetchMock.mockResolvedValueOnce(response({ version: 2, diff: [] }));
			} else {
				fetchMock
					.mockResolvedValueOnce(response({ diff: snapshot.records }))
					.mockResolvedValueOnce(response({ diff: [] }));
			}

			await expect(syncSession(session)).rejects.toThrow();
			expect(items.get(cacheKey(session.id))).toBe(original);
		}
	);

	it.each(["hotp", "steam"])("syncs and caches TOTP entries alongside %s entries", async (type) => {
		const { session, snapshot } = await signedIn();
		const unsupported = await fixture(0, OTP_URI.replace("totp/", `${type}/`) + "&counter=0");
		const records = [...snapshot.records, { ...unsupported.snapshot.records[0], id: "unsupported" }];
		fetchMock
			.mockResolvedValueOnce(response(snapshot.key))
			.mockResolvedValueOnce(response({ diff: records }))
			.mockResolvedValueOnce(response({ diff: [] }));
		expect((await syncSession(session)).entries).toEqual([
			expect.objectContaining({ id: "entry-a", issuer: "Synthetic" }),
		]);
		expect(JSON.parse(items.get(cacheKey(session.id)) as string).records).toHaveLength(2);
	});

	it("applies changes and deletions by ID and accepts a confirmed empty account", async () => {
		const { session, snapshot } = await signedIn();
		items.set(cacheKey(session.id), JSON.stringify(snapshot));
		fetchMock
			.mockResolvedValueOnce(response(snapshot.key))
			.mockResolvedValueOnce(response({ diff: snapshot.records }))
			.mockResolvedValueOnce(
				response({
					diff: [
						{ ...snapshot.records[0], updatedAt: 20 },
						{ id: "entry-a", updatedAt: 30, isDeleted: true, encryptedData: null, header: null },
					],
				})
			)
			.mockResolvedValueOnce(response({ diff: [] }));
		expect((await syncSession(session)).entries).toEqual([]);
		expect(JSON.parse(items.get(cacheKey(session.id)) as string).records).toEqual([]);
		fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({ diff: [] }));
		expect((await syncSession(session)).snapshot.key).toBeNull();
	});

	it("does not treat a missing key with live entries as an empty account", async () => {
		const { session, snapshot } = await signedIn();
		fetchMock
			.mockResolvedValueOnce(response({}, 404))
			.mockResolvedValueOnce(response({ diff: snapshot.records }))
			.mockResolvedValueOnce(response({ diff: [] }));
		await expect(syncSession(session)).rejects.toMatchObject({ kind: "invalid" });
		expect(items.has(cacheKey(session.id))).toBe(false);
	});

	it("overlaps full-page timestamps so tied records are not lost", async () => {
		const { session, snapshot } = await signedIn();
		const deleted = (id: number, time: number) => ({
			id: `deleted-${id}`,
			updatedAt: time,
			isDeleted: true,
			encryptedData: null,
			header: null,
		});
		const full = Array.from({ length: 5000 }, (_, index) => deleted(index, index + 10));
		fetchMock
			.mockResolvedValueOnce(response(snapshot.key))
			.mockResolvedValueOnce(response({ diff: full }))
			.mockResolvedValueOnce(
				response({ diff: [full[4999], { ...snapshot.records[0], updatedAt: full[4999].updatedAt }] })
			)
			.mockResolvedValueOnce(response({ diff: [] }));
		expect((await syncSession(session)).entries).toHaveLength(1);
		expect(fetchMock.mock.calls.at(-2)[0]).toContain("sinceTime=5008");
	});

	it("rejects a full timestamp boundary that cannot advance", async () => {
		const { session, snapshot } = await signedIn();
		const diff = Array.from({ length: 5000 }, (_, index) => ({
			id: String(index),
			updatedAt: 10,
			isDeleted: true,
			encryptedData: null,
			header: null,
		}));
		fetchMock
			.mockResolvedValueOnce(response(snapshot.key))
			.mockResolvedValueOnce(response({ diff }))
			.mockResolvedValueOnce(response({ diff }));
		await expect(syncSession(session)).rejects.toMatchObject({ kind: "invalid" });
		expect(items.has(cacheKey(session.id))).toBe(false);
	});

	it("rejects unsorted pages and records from another account", async () => {
		const { session, snapshot } = await signedIn();
		for (const diff of [
			[{ ...snapshot.records[0], updatedAt: 20 }, snapshot.records[0]],
			[{ ...snapshot.records[0], userID: session.userID + 1 }],
		]) {
			fetchMock.mockResolvedValueOnce(response(snapshot.key)).mockResolvedValueOnce(response({ diff }));
			await expect(syncSession(session)).rejects.toMatchObject({ kind: "invalid" });
		}
	});

	it("accepts an identical record at an overlapping page boundary", async () => {
		const { session, snapshot } = await signedIn();
		const firstPage = Array.from({ length: 5000 }, (_, index) => ({
			id: `deleted-${index}`,
			updatedAt: index + 1,
			isDeleted: true,
			encryptedData: null,
			header: null,
		}));
		fetchMock
			.mockResolvedValueOnce(response(snapshot.key))
			.mockResolvedValueOnce(response({ diff: firstPage }))
			.mockResolvedValueOnce(response({ diff: [firstPage[4999]] }))
			.mockResolvedValueOnce(response({ diff: [] }));
		expect((await syncSession(session)).entries).toEqual([]);
	});

	it("rejects conflicting copies of a record without changing the saved cache", async () => {
		const { session, snapshot } = await signedIn();
		const original = JSON.stringify(snapshot);
		items.set(cacheKey(session.id), original);
		const record = snapshot.records[0];
		fetchMock
			.mockResolvedValueOnce(response(snapshot.key))
			.mockResolvedValueOnce(response({ diff: [record, { ...record, encryptedData: "different data" }] }));
		await expect(syncSession(session)).rejects.toMatchObject({ kind: "invalid" });
		expect(items.get(cacheKey(session.id))).toBe(original);
	});

	it("rejects a late response after sign-out, even if fetch ignores cancellation", async () => {
		const { session, snapshot } = await signedIn();
		let release!: (value: Response) => void;
		fetchMock.mockImplementationOnce(
			() =>
				new Promise<Response>((resolve) => {
					release = resolve;
				})
		);
		const pending = syncSession(session);
		for (let tick = 0; tick < 100 && !release; tick++) {
			await Promise.resolve();
		}

		expect(release).toBeDefined();
		fetchMock.mockResolvedValue(response({}));
		await signOut();
		release(response(snapshot.key));
		await expect(pending).rejects.toMatchObject({ kind: "cancelled" });
		expect(await getSession()).toBeNull();
		expect(items.has(cacheKey(session.id))).toBe(false);
	});

	it("removes a cache write that completes after sign-out", async () => {
		const { session, snapshot } = await signedIn();
		const setItem = LocalStorage.setItem as jest.Mock;
		const originalWrite = setItem.getMockImplementation()!;
		setItem.mockImplementation(async (key: string, value: string) => {
			if (key === cacheKey(session.id)) {
				await signOut();
			}

			await originalWrite(key, value);
		});
		fetchMock
			.mockResolvedValueOnce(response(snapshot.key))
			.mockResolvedValueOnce(response({ diff: snapshot.records }))
			.mockResolvedValueOnce(response({ diff: [] }))
			.mockResolvedValue(response({}));
		await expect(syncSession(session)).rejects.toMatchObject({ kind: "cancelled" });
		expect(items.has(cacheKey(session.id))).toBe(false);
	});
});
