import { LocalStorage } from "@raycast/api";
import {
	finishSignIn,
	getSession,
	rejectSession,
	signOut,
	signInWithPassword,
	verifyEmail,
	verifyTOTP,
} from "../src/cloud/auth";
import { cacheKey, getMode, sessionKey } from "../src/cloud/storage";
import { STORAGE_KEY } from "../src/constants/secrets";
import { defaultContext, fixture, mockFetch, PASSWORD, response } from "./fixtures";
import { DEFAULT_API_ORIGIN } from "../src/cloud/server";
import { mockStorage } from "./storage";

describe("cloud sign-in", () => {
	let items: ReturnType<typeof mockStorage>;
	let fetchMock: ReturnType<typeof mockFetch>;
	beforeEach(() => {
		items = mockStorage();
		fetchMock = mockFetch();
	});

	it.each([
		"",
		"http://remote.example.com",
		"https://user:secret@api.example.com",
		"https://api.example.com/..",
	])("rejects invalid origin %s before requests or mode writes", async (apiOrigin) => {
		const before = [...items];
		await expect(signInWithPassword("a@example.com", PASSWORD, apiOrigin)).rejects.toBeDefined();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(LocalStorage.setItem).not.toHaveBeenCalled();
		expect([...items]).toEqual(before);
	});

	it.each(["https://api.example.com", "http://localhost:8080"])(
		"revokes only on the removed session's origin %s",
		async (apiOrigin) => {
			const { authorization } = await fixture();
			fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({}));
			const context = await signInWithPassword("a@example.com", PASSWORD, apiOrigin);
			const saved = await finishSignIn(context, authorization, PASSWORD);
			fetchMock.mockReset().mockRejectedValue(new Error("offline"));
			await signOut();
			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(fetchMock.mock.calls[0][0]).toBe(apiOrigin + "/users/logout");
			expect(fetchMock.mock.calls[0][1].headers["X-Auth-Token"]).toBe(saved.token);
			expect(await getSession()).toBeNull();
		}
	);

	it("does not accept delayed verification from an old server", async () => {
		const { authorization } = await fixture();
		fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({}));
		const old = await signInWithPassword("a@example.com", PASSWORD, "https://a.example.com");
		let release!: (value: Response) => void;
		fetchMock.mockImplementationOnce(
			() =>
				new Promise<Response>((resolve) => {
					release = resolve;
				})
		);
		const pending = verifyEmail(old, "a@example.com", "123456");
		for (let tick = 0; tick < 100 && !release; tick++) await Promise.resolve();
		expect(release).toBeDefined();
		await signOut();
		fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({}));
		const next = await signInWithPassword("a@example.com", PASSWORD, "https://b.example.com");
		const saved = await finishSignIn(next, authorization, PASSWORD);
		release(response(authorization));
		await expect(pending).rejects.toMatchObject({ kind: "cancelled" });
		expect(await getSession()).toEqual(saved);
	});

	it("verifies email and TOTP, saves only session material, and reopens the session", async () => {
		const { authorization } = await fixture();
		fetchMock
			.mockResolvedValueOnce(response({}, 404))
			.mockResolvedValueOnce(response({}))
			.mockResolvedValueOnce(response({ id: 123, twoFactorSessionID: "challenge" }))
			.mockResolvedValueOnce(response(authorization));
		const context = await signInWithPassword("USER@example.com", PASSWORD, "https://api.example.com");
		const { id } = context;
		const challenge = await verifyEmail(context, "USER@example.com", "123456");
		const verified = await verifyTOTP(context, challenge, "654321");
		const saved = await finishSignIn(context, verified, PASSWORD);
		expect(saved.apiOrigin).toBe("https://api.example.com");
		expect(fetchMock.mock.calls.every(([url]) => url.startsWith(saved.apiOrigin + "/"))).toBe(true);
		expect(await getSession()).toEqual(saved);
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
			email: "user@example.com",
			purpose: "login",
		});
		const writes = JSON.stringify([...items]);
		for (const forbidden of [
			PASSWORD,
			"Synthetic",
			"test@example.com",
			"JBSWY3DPEHPK3PXP",
			"keyAttributes",
			"encryptedSecretKey",
		]) {
			expect(writes).not.toContain(forbidden);
		}
		expect(Object.keys(JSON.parse(items.get(sessionKey(id)) as string)).sort()).toEqual([
			"apiOrigin",
			"id",
			"masterKey",
			"token",
			"userID",
		]);
		expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(PASSWORD);
	});

	it("retains imported data until explicit removal and defaults existing users to import mode", async () => {
		items.set(STORAGE_KEY, JSON.stringify([{ secret: "legacy" }]));
		expect((await getMode()).mode).toBe("import");
		fetchMock.mockImplementation(async () => response({})).mockResolvedValueOnce(response({}, 404));
		await signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		expect(items.has(STORAGE_KEY)).toBe(true);
		expect((await getMode()).mode).toBe("cloud");
	});

	it("rejects late sign-in after sign-out and removes saved cloud data without removing imports", async () => {
		const { authorization } = await fixture();
		fetchMock.mockImplementation(async () => response({})).mockResolvedValueOnce(response({}, 404));
		const { id } = await signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		await finishSignIn(defaultContext(id), authorization, PASSWORD);
		items.set(cacheKey(id), "encrypted-cache");
		items.set(STORAGE_KEY, "legacy");
		fetchMock.mockRejectedValue(new Error("offline"));
		await signOut();
		expect(await getSession()).toBeNull();
		expect([...items.keys()].filter((key) => key.includes("cloud"))).toEqual([]);
		expect(items.get(STORAGE_KEY)).toBe("legacy");
		await expect(finishSignIn(defaultContext(id), authorization, PASSWORD)).rejects.toMatchObject({
			kind: "cancelled",
		});
	});

	it("stops using a rejected session", async () => {
		const { authorization } = await fixture();
		fetchMock.mockImplementation(async () => response({})).mockResolvedValueOnce(response({}, 404));
		const { id } = await signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		const session = await finishSignIn(defaultContext(id), authorization, PASSWORD);
		await rejectSession(session);
		expect(await getSession()).toBeNull();
	});

	it("clears only the rejected account when a late rejection arrives after a new sign-in", async () => {
		const { authorization } = await fixture();
		fetchMock.mockImplementation(async () => response({})).mockResolvedValueOnce(response({}, 404));
		const { id: oldID } = await signInWithPassword("old@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		const oldSession = await finishSignIn(defaultContext(oldID), authorization, PASSWORD);
		await signOut();
		fetchMock.mockResolvedValueOnce(response({}, 404));
		const { id: newID } = await signInWithPassword("new@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		const newSession = await finishSignIn(defaultContext(newID), { ...authorization, id: 456 }, PASSWORD);
		await expect(rejectSession(oldSession)).resolves.toBeUndefined();
		expect(await getSession()).toEqual(newSession);
	});

	it("uses the account TOTP option supplied with a passkey challenge", async () => {
		const { authorization } = await fixture();
		const challenge = { id: 123, passkeySessionID: "passkey", twoFactorSessionIDV2: "totp-option" };
		const context = defaultContext((await getMode()).revision);
		fetchMock.mockResolvedValueOnce(response(authorization));
		expect(await verifyTOTP(context, challenge, "123456")).toEqual(authorization);
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ sessionID: "totp-option", code: "123456" });
	});

	it("does not save a session when verification or password unlock fails", async () => {
		const { authorization } = await fixture();
		fetchMock
			.mockResolvedValueOnce(response({}, 404))
			.mockResolvedValueOnce(response({}))
			.mockResolvedValueOnce(response({}, 401));
		const { id } = await signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		await expect(verifyEmail(defaultContext(id), "a@example.com", "bad")).rejects.toMatchObject({
			kind: "verification",
		});
		await expect(finishSignIn(defaultContext(id), authorization, "bad password")).rejects.toMatchObject({
			kind: "verification",
		});
		expect(await getSession()).toBeNull();
		expect(LocalStorage.setItem).not.toHaveBeenCalledWith(sessionKey(id), expect.anything());
	});
});
