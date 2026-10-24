import { LocalStorage } from "@raycast/api";
import { SRP, SrpServer } from "fast-srp-hap";
import sodium from "libsodium-wrappers-sumo";
import {
	finishSignIn,
	getSession,
	signInWithPassword,
	signOut,
	verifyEmail,
	verifyTOTP,
} from "../src/cloud/auth";
import { loadCache } from "../src/cloud/cache";
import { request } from "../src/cloud/client";
import { TOTPModel } from "../src/cloud/model";
import { DEFAULT_API_ORIGIN, normalizeAPIOrigin } from "../src/cloud/server";
import { createSRPClient } from "../src/cloud/srp";
import { cacheKey, changeMode } from "../src/cloud/storage";
import { syncSession } from "../src/cloud/sync";
import { STORAGE_KEY } from "../src/constants/secrets";
import { parseSecrets, storeSecrets } from "../src/helpers/secrets";
import { fixture, mockFetch, mockStorage, OTP_URI, PASSWORD, response } from "./fixtures";

const parameters = { ...SRP.params[4096], hash: "sha256" };
const srpUserID = "e63ca810-f1cf-41a7-9eb9-b582cd4aefc3";
const srpSalt = Buffer.alloc(16, 7);
let data: Awaited<ReturnType<typeof fixture>>;
let items: ReturnType<typeof mockStorage>;
let fetchMock: ReturnType<typeof mockFetch>;

beforeEach(async () => {
	items = mockStorage();
	fetchMock = mockFetch().mockImplementation(async () => response({}));
	data = await fixture();
});

async function signedIn() {
	fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({}));
	const context = await signInWithPassword("a@example.com", PASSWORD, "https://api.example.com");
	const session = await finishSignIn(context, data.authorization, PASSWORD);
	data.snapshot = { ...data.snapshot, sessionID: session.id, apiOrigin: session.apiOrigin };
	return session;
}

function queueSync() {
	fetchMock
		.mockResolvedValueOnce(response(data.snapshot.key))
		.mockResolvedValueOnce(response({ diff: data.snapshot.records }))
		.mockResolvedValueOnce(response({ diff: [] }));
}

function srpServer(challenge = false, badProof = false) {
	const attributes = {
		...data.authorization.keyAttributes!,
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
	// Derive the server's login key independently of the extension.
	const loginKey = sodium.crypto_kdf_derive_from_key(32, 1, "loginctx", kek).slice(0, 16);
	const verifier = SRP.computeVerifier(parameters, srpSalt, Buffer.from(srpUserID), Buffer.from(loginKey));
	const remote = new SrpServer(parameters, verifier, Buffer.alloc(64, 8));
	fetchMock.mockImplementation(async (url, init) => {
		if (url.includes("/srp/attributes?")) return response({ attributes });
		if (url.endsWith("/srp/create-session")) {
			remote.setA(Buffer.from(JSON.parse(init.body).srpA, "base64"));
			return response({ sessionID: "srp-session", srpB: remote.computeB().toString("base64") });
		}
		if (url.endsWith("/srp/verify-session")) {
			try {
				remote.checkM1(Buffer.from(JSON.parse(init.body).srpM1, "base64"));
			} catch {
				return response({}, 401);
			}
			return response({
				...(challenge ? { id: 123, twoFactorSessionID: "totp" } : data.authorization),
				srpM2: (badProof ? Buffer.alloc(32) : remote.computeM2()).toString("base64"),
			});
		}
		if (url.endsWith("/two-factor/verify")) return response(data.authorization);
		throw new Error("Unexpected endpoint");
	});
}

it.each([false, true])("signs in with SRP and verifies account TOTP when required: %s", async (challenge) => {
	srpServer(challenge);
	const apiOrigin = challenge ? "https://api.example.com" : DEFAULT_API_ORIGIN;
	const attempt = await signInWithPassword("USER@example.com", PASSWORD, apiOrigin);
	expect(await getSession()).toBeNull();
	const authorization = challenge
		? await verifyTOTP(attempt, attempt.authorization!, "123456")
		: attempt.authorization!;
	const session = await finishSignIn(attempt, authorization, "", undefined, attempt.passwordKey);
	expect(await getSession()).toEqual(session);
	expect(session.apiOrigin).toBe(apiOrigin);
	expect(attempt.passwordKey!.key.every((byte) => byte === 0)).toBe(true);
	expect(fetchMock.mock.calls.every(([url]) => url.startsWith(apiOrigin + "/"))).toBe(true);
	expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/users/ott"))).toBe(false);
	expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(PASSWORD);
	expect(JSON.stringify([...items])).not.toContain(PASSWORD);
});

it.each(["password", "server proof"])(
	"rejects an invalid %s without email fallback or saving a session",
	async (failure) => {
		srpServer(false, failure === "server proof");
		await expect(
			signInWithPassword("a@example.com", failure === "password" ? "wrong" : PASSWORD, DEFAULT_API_ORIGIN)
		).rejects.toBeDefined();
		expect(await getSession()).toBeNull();
		expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/users/ott"))).toBe(false);
	}
);

it.each([false, true])(
	"supports email verification for legacy and email-MFA accounts: mfa=%s",
	async (mfa) => {
		fetchMock
			.mockResolvedValueOnce(
				mfa
					? response({
							attributes: {
								...data.authorization.keyAttributes,
								srpUserID,
								srpSalt: srpSalt.toString("base64"),
								isEmailMFAEnabled: true,
							},
						})
					: response({}, 404)
			)
			.mockResolvedValueOnce(response({}))
			.mockResolvedValueOnce(response(data.authorization));
		const attempt = await signInWithPassword("USER@example.com", PASSWORD, DEFAULT_API_ORIGIN);
		expect(attempt.authorization).toBeUndefined();
		const authorization = await verifyEmail(attempt, "USER@example.com", "123456");
		const session = await finishSignIn(attempt, authorization, PASSWORD);
		expect(await getSession()).toEqual(session);
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
			email: "user@example.com",
			purpose: "login",
		});
	}
);

it("does not save a session after failed verification, a wrong password, or unsafe key settings", async () => {
	fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({}));
	const attempt = await signInWithPassword("a@example.com", PASSWORD, DEFAULT_API_ORIGIN);
	fetchMock.mockResolvedValueOnce(response({}, 401));
	await expect(verifyEmail(attempt, "a@example.com", "bad")).rejects.toMatchObject({ kind: "verification" });
	await expect(finishSignIn(attempt, data.authorization, "wrong")).rejects.toMatchObject({
		kind: "verification",
	});
	data.authorization.keyAttributes!.memLimit = 2 * 1024 ** 3;
	await expect(finishSignIn(attempt, data.authorization, PASSWORD)).rejects.toMatchObject({
		kind: "unsupported",
	});
	expect(await getSession()).toBeNull();
});

it("matches the Ente SRP wire vector when A needs a leading zero", () => {
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

it("keeps requests on the chosen server and refuses unsafe origins, routes, and redirects", async () => {
	expect(normalizeAPIOrigin(" HTTPS://API.EXAMPLE.COM:443/ ")).toBe("https://api.example.com");
	expect(normalizeAPIOrigin("http://localhost:8080")).toBe("http://localhost:8080");
	for (const origin of [
		"http://remote.example.com",
		"https://user:pass@api.example.com",
		"https://api.example.com/path",
	]) {
		await expect(signInWithPassword("a@example.com", PASSWORD, origin)).rejects.toBeDefined();
	}
	await expect(request("https://other.example.com/users", { session: data.session })).rejects.toBeDefined();
	expect(fetchMock).not.toHaveBeenCalled();
	fetchMock.mockResolvedValueOnce(
		new Response(null, { status: 302, headers: { Location: "https://other.example.com" } })
	);
	await expect(request("/authenticator/key", { session: data.session })).rejects.toBeDefined();
	expect(fetchMock).toHaveBeenCalledTimes(1);
	expect(fetchMock.mock.calls[0][1].redirect).toBe("error");
});

it("syncs once, saves only encrypted entries, and reopens cached codes offline", async () => {
	const session = await signedIn();
	queueSync();
	let model = new TOTPModel();
	try {
		await model.start();
		await model.start();
		expect(model.state).toMatchObject({
			status: "Up to date",
			hasSession: true,
			apiOrigin: session.apiOrigin,
		});
		expect(model.state.entries[0]).toMatchObject({
			issuer: "Synthetic",
			algorithm: "SHA256",
			digits: 8,
			period: "60",
		});
		const cache = items.get(cacheKey(session.id)) as string;
		expect(cache).toContain(data.snapshot.records[0].encryptedData);
		for (const value of [
			PASSWORD,
			"Synthetic",
			"test@example.com",
			"JBSWY3DPEHPK3PXP",
			"otpauth:",
			"current_totp",
		]) {
			expect(JSON.stringify([...items])).not.toContain(value);
		}
		const requests = fetchMock.mock.calls.length;
		await model.tick();
		expect(fetchMock).toHaveBeenCalledTimes(requests);
		model.dispose();
		model = new TOTPModel();
		fetchMock.mockRejectedValue(new Error("private network details"));
		await model.start();
		expect(model.state.status).toBe("Offline");
		expect(model.state.entries).toHaveLength(1);
		expect(model.state.error).not.toContain("private network details");
		expect(items.get(cacheKey(session.id))).toBe(cache);
	} finally {
		model.dispose();
	}
});

it("rejects altered ciphertext without replacing a valid cache", async () => {
	const session = await signedIn();
	const saved = JSON.stringify(data.snapshot);
	items.set(cacheKey(session.id), saved);
	const bytes = Buffer.from(data.snapshot.records[0].encryptedData!, "base64");
	bytes[5] ^= 1;
	data.snapshot.records[0].encryptedData = bytes.toString("base64");
	queueSync();
	await expect(syncSession(session)).rejects.toMatchObject({ kind: "invalid" });
	expect(items.get(cacheKey(session.id))).toBe(saved);
});

it("refuses caches from a different server, account, or session", async () => {
	const session = await signedIn();
	for (const change of [
		{ apiOrigin: "https://other.example.com" },
		{ userID: session.userID + 1 },
		{ sessionID: "other" },
	]) {
		const saved = JSON.stringify({ ...data.snapshot, ...change });
		items.set(cacheKey(session.id), saved);
		await expect(loadCache(session)).rejects.toMatchObject({ kind: "invalid" });
		expect(items.get(cacheKey(session.id))).toBe(saved);
	}
});

it("keeps records tied across page boundaries and applies deletions", async () => {
	const session = await signedIn();
	const page = Array.from({ length: 5000 }, (_, index) => ({
		id: `deleted-${index}`,
		updatedAt: index + 10,
		isDeleted: true,
		encryptedData: null,
		header: null,
	}));
	fetchMock
		.mockResolvedValueOnce(response(data.snapshot.key))
		.mockResolvedValueOnce(response({ diff: page }))
		.mockResolvedValueOnce(
			response({ diff: [page[4999], { ...data.snapshot.records[0], updatedAt: page[4999].updatedAt }] })
		)
		.mockResolvedValueOnce(response({ diff: [] }));
	expect((await syncSession(session)).entries).toHaveLength(1);
	expect(fetchMock.mock.calls.at(-2)[0]).toContain("sinceTime=5008");
	fetchMock
		.mockResolvedValueOnce(response(data.snapshot.key))
		.mockResolvedValueOnce(
			response({
				diff: [{ id: "entry-a", updatedAt: 6000, isDeleted: true, encryptedData: null, header: null }],
			})
		)
		.mockResolvedValueOnce(response({ diff: [] }));
	expect((await syncSession(session)).entries).toEqual([]);
	expect(JSON.parse(items.get(cacheKey(session.id)) as string).records).toEqual([]);
});

it.each(["response", "cache write"])(
	"blocks a late %s after sign-out and preserves imports",
	async (stage) => {
		const session = await signedIn();
		items.set(STORAGE_KEY, "legacy entries");
		if (stage === "response") {
			fetchMock.mockImplementationOnce(async () => {
				await signOut();
				return response(data.snapshot.key);
			});
		} else {
			const write = (LocalStorage.setItem as jest.Mock).getMockImplementation()!;
			(LocalStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
				if (key === cacheKey(session.id)) await signOut();
				await write(key, value);
			});
			queueSync();
		}
		await expect(syncSession(session)).rejects.toMatchObject({ kind: "cancelled" });
		expect(await getSession()).toBeNull();
		expect(items.has(cacheKey(session.id))).toBe(false);
		expect([...items.keys()].filter((key) => key.startsWith("ente-auth.cloud."))).toEqual([]);
		expect(items.get(STORAGE_KEY)).toBe("legacy entries");
	}
);

it("clears rejected sessions and cached codes without retrying", async () => {
	const session = await signedIn();
	items.set(cacheKey(session.id), JSON.stringify(data.snapshot));
	fetchMock.mockResolvedValueOnce(response({}, 401));
	const model = new TOTPModel();
	try {
		await model.start();
		expect(model.state).toMatchObject({ status: "Sign-in required", hasSession: false, entries: [] });
		expect(await getSession()).toBeNull();
		const requests = fetchMock.mock.calls.length;
		await model.refresh();
		await model.tick();
		expect(fetchMock).toHaveBeenCalledTimes(requests);
	} finally {
		model.dispose();
	}
});

it.each([false, true])(
	"reloads imports on local ticks without cloud requests: saved mode=%s",
	async (savedMode) => {
		const entries = parseSecrets([OTP_URI]);
		await storeSecrets(entries);
		if (savedMode) await changeMode("import");
		const model = new TOTPModel();
		try {
			await model.start();
			expect(model.state).toMatchObject({ mode: "import", entries, hasSession: false });
			const updated = parseSecrets([
				OTP_URI.replace("Synthetic", "Updated").replace("JBSWY3DPEHPK3PXP", "GEZDGNBVGY3TQOJQ"),
			]);
			await storeSecrets(updated);
			await model.tick();
			expect(model.state).toMatchObject({ mode: "import", entries: updated, hasImportedEntries: true });
			expect(fetchMock).not.toHaveBeenCalled();
		} finally {
			model.dispose();
		}
	}
);

it("loads and removes imported entries without cloud requests", async () => {
	const entries = parseSecrets([OTP_URI]);
	items.set(STORAGE_KEY, JSON.stringify(entries));
	const model = new TOTPModel();
	try {
		await model.start();
		expect(model.state).toMatchObject({ mode: "import", entries, hasSession: false });
		await model.removeImportedEntries();
		expect(items.has(STORAGE_KEY)).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	} finally {
		model.dispose();
	}
});
