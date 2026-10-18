import { LocalStorage } from "@raycast/api";
import sodium from "libsodium-wrappers-sumo";
import { SRP, SrpServer } from "fast-srp-hap";
import { signInWithPassword, finishSignIn, getSession, signOut, verifyTOTP } from "../src/cloud/auth";
import { createSRPClient, deriveLoginKey } from "../src/cloud/srp";
import { getMode } from "../src/cloud/storage";
import { STORAGE_KEY } from "../src/constants/secrets";
import { fixture, mockFetch, PASSWORD, response } from "./fixtures";
import { mockStorage } from "./storage";
import { DEFAULT_API_ORIGIN } from "../src/cloud/server";

const parameters = { ...SRP.params[4096], hash: "sha256" };
const srpUserID = "e63ca810-f1cf-41a7-9eb9-b582cd4aefc3";
const srpSalt = Buffer.alloc(16, 7);

describe("password sign-in", () => {
	let items: ReturnType<typeof mockStorage>;
	let fetchMock: ReturnType<typeof mockFetch>;
	beforeEach(() => {
		items = mockStorage();
		fetchMock = mockFetch();
	});

	async function server(options: { badProof?: boolean; challenge?: boolean; wrongB?: boolean } = {}) {
		const { authorization } = await fixture();
		const attributes = {
			...authorization.keyAttributes!,
			srpUserID,
			srpSalt: srpSalt.toString("base64"),
			isEmailMFAEnabled: false,
		};
		const kek = sodium.crypto_pwhash(
			32,
			PASSWORD,
			Buffer.from(attributes.kekSalt, "base64"),
			1,
			8192,
			sodium.crypto_pwhash_ALG_ARGON2ID13
		);
		// Independent use of the KDF makes the mock server reject a wrong login subkey.
		const loginKey = sodium.crypto_kdf_derive_from_key(32, 1, "loginctx", kek).slice(0, 16);
		const verifier = SRP.computeVerifier(parameters, srpSalt, Buffer.from(srpUserID), Buffer.from(loginKey));
		const remote = new SrpServer(parameters, verifier, Buffer.alloc(64, 8));
		fetchMock.mockImplementation(async (url, init) => {
			if (url.includes("/srp/attributes?")) {
				return response({ attributes });
			}

			if (url.endsWith("/srp/create-session")) {
				const body = JSON.parse(init.body);
				expect(body.srpUserID).toBe(srpUserID);
				expect(Buffer.from(body.srpA, "base64")).toHaveLength(512);
				remote.setA(Buffer.from(body.srpA, "base64"));
				return response({
					sessionID: "srp-session",
					srpB: (options.wrongB ? Buffer.alloc(512) : remote.computeB()).toString("base64"),
				});
			}
			if (url.endsWith("/srp/verify-session")) {
				const body = JSON.parse(init.body);
				expect(body.sessionID).toBe("srp-session");
				try {
					remote.checkM1(Buffer.from(body.srpM1, "base64"));
				} catch {
					return response({}, 401);
				}
				return response({
					...(options.challenge ? { id: 123, twoFactorSessionID: "totp" } : authorization),
					srpM2: (options.badProof ? Buffer.alloc(32) : remote.computeM2()).toString("base64"),
				});
			}
			if (url.endsWith("/two-factor/verify")) {
				return response(authorization);
			}

			throw new Error("Unexpected endpoint");
		});
		return { authorization, attributes };
	}

	it.each([DEFAULT_API_ORIGIN, "https://api.example.com", "http://localhost:8080"])(
		"signs in on %s without email and reuses the password key",
		async (apiOrigin) => {
			await server();
			const attempt = await signInWithPassword("USER@example.com", PASSWORD, apiOrigin);
			expect(attempt.authorization?.encryptedToken).toBeDefined();
			expect(attempt.passwordKey?.key).toHaveLength(32);
			const saved = await finishSignIn(attempt, attempt.authorization!, "", undefined, attempt.passwordKey);
			expect(saved.apiOrigin).toBe(apiOrigin);
			expect(fetchMock.mock.calls.every(([url]) => url.startsWith(apiOrigin + "/"))).toBe(true);
			expect(await getSession()).toEqual(saved);
			expect(attempt.passwordKey!.key.every((byte) => byte === 0)).toBe(true);
			expect(fetchMock.mock.calls[0][0]).toContain("email=user%40example.com");
			expect(fetchMock.mock.calls.map(([url]) => url).some((url) => url.includes("/users/ott"))).toBe(false);
			for (const forbidden of [PASSWORD, "loginctx", "passwordKey", "kekSalt", "srpSalt", "srpUserID"]) {
				expect(JSON.stringify([...items])).not.toContain(forbidden);
			}
			expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(PASSWORD);
		}
	);

	it("keeps required account TOTP after password authentication", async () => {
		await server({ challenge: true });
		const attempt = await signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		expect(attempt.authorization?.twoFactorSessionID).toBe("totp");
		expect(await getSession()).toBeNull();
		const authorization = await verifyTOTP(attempt, attempt.authorization!, "123456");
		await finishSignIn(attempt, authorization, "", undefined, attempt.passwordKey);
		expect(await getSession()).not.toBeNull();
	});

	it.each(["email-mfa", "legacy"])("sends an email code only for %s accounts", async (kind) => {
		const { attributes } = await server();
		fetchMock
			.mockReset()
			.mockResolvedValueOnce(
				kind === "legacy"
					? response({}, 404)
					: response({ attributes: { ...attributes, isEmailMFAEnabled: true } })
			)
			.mockResolvedValueOnce(response({}));
		const attempt = await signInWithPassword("USER@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		expect(attempt.authorization).toBeUndefined();
		expect(attempt.passwordKey).toBeUndefined();
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[1][0]).toMatch(/\/users\/ott$/);
	});

	it.each(["wrong password", "server proof", "invalid B"])(
		"rejects %s without email fallback or a saved session",
		async (kind) => {
			await server({ badProof: kind === "server proof", wrongB: kind === "invalid B" });
			await expect(
				signInWithPassword(
					"a@example.com",
					kind === "wrong password" ? "wrong" : PASSWORD,
					DEFAULT_API_ORIGIN
				)
			).rejects.toBeDefined();
			expect(await getSession()).toBeNull();
			expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/users/ott"))).toBe(false);
		}
	);

	it.each([500, 429])("does not downgrade to email after HTTP %s", async (status) => {
		items.set(STORAGE_KEY, JSON.stringify([{ secret: "legacy" }]));
		const before = await getMode();
		fetchMock.mockResolvedValue(response({}, status));
		await expect(signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN)).rejects.toBeDefined();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(await getMode()).toEqual(before);
	});

	it("rejects missing account settings instead of skipping email verification", async () => {
		items.set(STORAGE_KEY, JSON.stringify([{ secret: "legacy" }]));
		const before = await getMode();
		const { attributes } = await server();
		fetchMock
			.mockReset()
			.mockResolvedValue(response({ attributes: { ...attributes, isEmailMFAEnabled: undefined } }));
		await expect(signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN)).rejects.toMatchObject({
			kind: "invalid",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(await getMode()).toEqual(before);
	});

	it.each(["cloud", "import"] as const)("stops if sign-out selects %s mode during lookup", async (mode) => {
		const { attributes } = await server();
		fetchMock.mockReset().mockImplementation(async () => {
			await signOut(mode);
			return response({ attributes });
		});
		await expect(signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN)).rejects.toMatchObject({
			kind: "cancelled",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect((await getMode()).mode).toBe(mode);
	});

	it.each(["lookup", "mode-check"])("keeps import mode if sign-in is cancelled during %s", async (step) => {
		items.set(STORAGE_KEY, JSON.stringify([{ secret: "legacy" }]));
		const before = await getMode();
		const { attributes } = await server();
		const controller = new AbortController();
		let lookupComplete = false;
		const getItem = LocalStorage.getItem as jest.Mock;
		const read = getItem.getMockImplementation()!;
		getItem.mockImplementation(async (key: string) => {
			const value = await read(key);
			if (step === "mode-check" && lookupComplete) {
				controller.abort();
			}
			return value;
		});
		fetchMock.mockReset().mockImplementation(async () => {
			lookupComplete = true;
			if (step === "lookup") {
				controller.abort();
			}
			return response({ attributes });
		});
		await expect(
			signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN, controller.signal)
		).rejects.toMatchObject({
			kind: "cancelled",
		});
		expect(await getMode()).toEqual(before);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("does not replace a newer sign-in attempt when an older lookup finishes", async () => {
		const { authorization } = await fixture();
		let release!: (value: Response) => void;
		fetchMock.mockImplementation(async (url) => {
			if (url.includes("old%40example.com")) {
				return new Promise<Response>((resolve) => {
					release = resolve;
				});
			}
			return response({}, url.includes("/srp/attributes?") ? 404 : 200);
		});
		const pending = signInWithPassword("old@example.com", PASSWORD, "https://old.example.com");
		for (let tick = 0; tick < 100 && !release; tick++) {
			await Promise.resolve();
		}
		expect(release).toBeDefined();
		const current = await signInWithPassword("new@example.com", PASSWORD, "https://new.example.com");
		release(response({}, 404));
		await expect(pending).rejects.toMatchObject({ kind: "cancelled" });
		await finishSignIn(current, authorization, PASSWORD);
		expect((await getSession())?.id).toBe(current.id);
	});

	it("does not reuse a password key with changed account key settings", async () => {
		await server();
		const attempt = await signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		attempt.authorization!.keyAttributes!.kekSalt = Buffer.alloc(16, 9).toString("base64");
		await expect(
			finishSignIn(attempt, attempt.authorization!, "", undefined, attempt.passwordKey)
		).rejects.toBeDefined();
		expect(await getSession()).toBeNull();
		expect(attempt.passwordKey!.key.every((byte) => byte === 0)).toBe(true);
	});

	it("rejects sign-out after SRP authentication and clears the pending key", async () => {
		await server();
		const attempt = await signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		await signOut();
		await expect(
			finishSignIn(attempt, attempt.authorization!, "", undefined, attempt.passwordKey)
		).rejects.toMatchObject({ kind: "cancelled" });
		expect(attempt.passwordKey!.key.every((byte) => byte === 0)).toBe(true);
		expect(await getSession()).toBeNull();
	});

	it("requires sign-out before another password sign-in", async () => {
		await server();
		const attempt = await signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		await finishSignIn(attempt, attempt.authorization!, "", undefined, attempt.passwordKey);
		fetchMock.mockClear();
		await expect(signInWithPassword("other@example.com", PASSWORD, DEFAULT_API_ORIGIN)).rejects.toMatchObject(
			{
				kind: "verification",
			}
		);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(await getSession()).not.toBeNull();
	});

	it("rejects unsupported password work settings before an SRP exchange", async () => {
		const { attributes } = await server();
		fetchMock
			.mockReset()
			.mockResolvedValueOnce(response({ attributes: { ...attributes, memLimit: 2 * 1024 ** 3 } }));
		await expect(signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN)).rejects.toMatchObject({
			kind: "unsupported",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(await getSession()).toBeNull();
	});
});

describe("Ente SRP wire compatibility", () => {
	it("matches the Go server vector when A needs a leading zero", () => {
		const salt = Buffer.from("0123456789abcdef");
		const key = Buffer.from("1234567890abcdef");
		const secret = Buffer.alloc(64);
		secret.writeUInt16BE(0x06de, 62);
		const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
		try {
			const client = createSRPClient("repro-user-id", salt, key, secret);
			const verifier = SRP.computeVerifier(parameters, salt, Buffer.from("repro-user-id"), key);
			const remote = new SrpServer(parameters, verifier, Buffer.alloc(64, 0x42));
			expect(client.computeA()).toHaveLength(512);
			expect(client.computeA()[0]).toBe(0);
			client.setB(remote.computeB());
			expect(client.computeM1().toString("hex")).toBe(
				"c0953b8c74d400fbf664a515deb700d73b65231e7e207a2e2326ff8cf70567ac"
			);
		} finally {
			warn.mockRestore();
		}
	});

	it("uses a 32-byte loginctx subkey truncated to 16 bytes", async () => {
		await sodium.ready;
		const kek = new Uint8Array(32).fill(3);
		expect(deriveLoginKey(kek)).toEqual(
			Buffer.from(sodium.crypto_kdf_derive_from_key(32, 1, "loginctx", kek).slice(0, 16))
		);
		expect(deriveLoginKey(kek)).not.toEqual(
			Buffer.from(sodium.crypto_kdf_derive_from_key(16, 1, "loginctx", kek))
		);
	});
});
