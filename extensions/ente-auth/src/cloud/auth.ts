import { LocalStorage } from "@raycast/api";
import { request } from "./client";
import { derivePasswordKey, fromBase64, toBase64, unlockAuthorization } from "./crypto";
import { CloudError } from "./errors";
import {
	assertCurrent,
	cacheKey,
	changeMode,
	getMode,
	getSession,
	sessionKey,
	writeCurrent,
} from "./storage";
import { Authorization, PasswordKey, Session, SignInAttempt, SignInContext, SRPAttributes } from "./types";
import { normalizeAPIOrigin } from "./server";
import { object, readAuthorization, readSRPAttributes, text } from "./validation";
import { createSRPClient, deriveLoginKey, verifyServerProof } from "./srp";

export { getSession } from "./storage";

export async function signInWithPassword(
	email: string,
	password: string,
	apiOrigin: string,
	signal?: AbortSignal
): Promise<SignInAttempt> {
	apiOrigin = normalizeAPIOrigin(apiOrigin);
	if (!password) {
		throw new CloudError("verification", "Enter your Ente password.");
	}

	const previous = await getMode();
	if (await getSession()) {
		throw new CloudError("verification", "Sign out before you sign in to another account.");
	}

	const address = email.trim().toLowerCase();
	const result = await request(`/users/srp/attributes?${new URLSearchParams({ email: address })}`, {
		apiOrigin,
		signal,
		allowNotFound: true,
	});

	const attributes = result === null ? null : readSRPAttributes(result);
	const modeState = await changeMode("cloud", previous.revision, signal);
	const context: SignInContext = { id: modeState.revision, apiOrigin };
	await assertCurrent(modeState.revision, signal);

	if (!attributes || attributes.isEmailMFAEnabled) {
		await request("/users/ott", { apiOrigin, body: { email: address, purpose: "login" }, signal });
		await assertCurrent(modeState.revision, signal);
		return context;
	}

	const passwordKey = await derivePasswordKey(password, attributes);

	try {
		const authorization = await authorizeWithSRP(attributes, passwordKey.key, context, signal);
		return { ...context, authorization, passwordKey };
	} catch (error) {
		passwordKey.key.fill(0);
		throw error;
	}
}

async function authorizeWithSRP(
	attributes: SRPAttributes,
	passwordKey: Uint8Array,
	context: SignInContext,
	signal?: AbortSignal
): Promise<Authorization> {
	let loginKey: Buffer | undefined;
	const { id: attemptID, apiOrigin } = context;

	try {
		await assertCurrent(attemptID, signal);

		loginKey = deriveLoginKey(passwordKey);
		const client = createSRPClient(attributes.srpUserID, fromBase64(attributes.srpSalt, 16), loginKey);
		const session = object(
			await request("/users/srp/create-session", {
				apiOrigin,
				body: { srpUserID: attributes.srpUserID, srpA: toBase64(client.computeA()) },
				signal,
			})
		);

		await assertCurrent(attemptID, signal);

		client.setB(Buffer.from(fromBase64(text(session.srpB), 512)));
		const verified = object(
			await request("/users/srp/verify-session", {
				apiOrigin,
				body: {
					sessionID: text(session.sessionID),
					srpUserID: attributes.srpUserID,
					srpM1: toBase64(client.computeM1()),
				},
				signal,
			})
		);

		verifyServerProof(client, fromBase64(text(verified.srpM2), 32));
		await assertCurrent(attemptID, signal);

		return readAuthorization(verified);
	} finally {
		loginKey?.fill(0);
	}
}

export async function verifyEmail(
	context: SignInContext,
	email: string,
	code: string,
	signal?: AbortSignal
): Promise<Authorization> {
	const { id, apiOrigin } = context;
	await assertCurrent(id, signal);
	const result = readAuthorization(
		await request("/users/verify-email", {
			apiOrigin,
			body: { email: email.trim().toLowerCase(), ott: code.trim() },
			signal,
		})
	);
	await assertCurrent(id, signal);
	return result;
}

export async function verifyTOTP(
	context: SignInContext,
	authorization: Authorization,
	code: string,
	signal?: AbortSignal
): Promise<Authorization> {
	const { id, apiOrigin } = context;
	await assertCurrent(id, signal);
	const sessionID = authorization.twoFactorSessionID || authorization.twoFactorSessionIDV2;
	if (!sessionID) {
		throw new CloudError("verification", "Start sign-in again.");
	}

	const result = readAuthorization(
		await request("/users/two-factor/verify", { apiOrigin, body: { sessionID, code: code.trim() }, signal })
	);
	await assertCurrent(id, signal);
	if (result.id !== authorization.id) {
		throw new CloudError("invalid", "The account changed. Start sign-in again.");
	}

	return result;
}

export async function finishSignIn(
	context: SignInContext,
	authorization: Authorization,
	password: string,
	signal?: AbortSignal,
	passwordKey?: PasswordKey
): Promise<Session> {
	const { id, apiOrigin } = context;
	try {
		if (normalizeAPIOrigin(apiOrigin) !== apiOrigin) {
			throw new CloudError("invalid", "Start sign-in again.");
		}
		await assertCurrent(id, signal);

		const material = await unlockAuthorization(authorization, password, passwordKey);
		const session: Session = { id, apiOrigin, ...material };

		await writeCurrent(id, sessionKey(id), session, signal);

		return session;
	} finally {
		passwordKey?.key.fill(0);
	}
}

export async function signOut(mode: "cloud" | "import" = "cloud"): Promise<void> {
	// Cleanup must work even if the saved session is damaged or unsupported.
	const session = await getSession().catch(() => null);
	await changeMode(mode);

	if (session) {
		// Local removal is unconditional. Revocation is best effort when offline.
		await request("/users/logout", {
			body: {},
			session,
			signal: AbortSignal.timeout(3000),
		}).catch(() => undefined);
	}
}

export async function rejectSession(session: Session): Promise<void> {
	// A late rejection must not change the active account's mode or keys.
	await LocalStorage.removeItem(sessionKey(session.id));
	await LocalStorage.removeItem(cacheKey(session.id));
}
