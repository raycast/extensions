import sodium from "libsodium-wrappers-sumo";
import { parseSecretURL } from "../helpers/parse-secret";
import { Secret } from "../helpers/types";
import { CloudError, invalidData } from "./errors";
import { normalizeAPIOrigin } from "./server";
import {
	Authorization,
	EncryptedRecord,
	PasswordKey,
	PasswordKeyAttributes,
	Session,
	Snapshot,
} from "./types";

export function fromBase64(value: string, length?: number): Uint8Array {
	const bytes = sodium.from_base64(value, sodium.base64_variants.ORIGINAL);
	if (length !== undefined && bytes.length !== length) {
		throw invalidData();
	}

	return bytes;
}

export const toBase64 = (value: Uint8Array) => sodium.to_base64(value, sodium.base64_variants.ORIGINAL);

function decryptKey(encryptedKey: string, nonce: string, key: Uint8Array): Uint8Array {
	return sodium.crypto_secretbox_open_easy(fromBase64(encryptedKey), fromBase64(nonce), key);
}

export async function derivePasswordKey(
	password: string,
	attributes: PasswordKeyAttributes
): Promise<PasswordKey> {
	await sodium.ready;

	const { kekSalt, memLimit, opsLimit } = attributes;
	// API parsing checks types and minimum values. These local limits cap memory (bytes) and CPU use.
	if (memLimit > 1024 ** 3 || opsLimit > 64 || memLimit * opsLimit > 8 * 1024 ** 3) {
		throw new CloudError(
			"unsupported",
			"This account uses unsupported password key settings. Use the Ente app."
		);
	}

	return {
		kekSalt,
		memLimit,
		opsLimit,
		key: sodium.crypto_pwhash(
			32,
			password,
			fromBase64(kekSalt),
			opsLimit,
			memLimit,
			sodium.crypto_pwhash_ALG_ARGON2ID13
		),
	};
}

export async function unlockAuthorization(
	authorization: Authorization,
	password: string,
	passwordKey?: PasswordKey
): Promise<Pick<Session, "userID" | "token" | "masterKey">> {
	await sodium.ready;

	const attributes = authorization.keyAttributes;
	if (!attributes || !authorization.encryptedToken) {
		throw invalidData();
	}

	let kek: Uint8Array | undefined;
	let privateKey: Uint8Array | undefined;

	try {
		if (
			passwordKey &&
			(passwordKey.kekSalt !== attributes.kekSalt ||
				passwordKey.memLimit !== attributes.memLimit ||
				passwordKey.opsLimit !== attributes.opsLimit)
		) {
			throw invalidData();
		}

		kek = passwordKey?.key ?? (await derivePasswordKey(password, attributes)).key;
		const masterKey = decryptKey(attributes.encryptedKey, attributes.keyDecryptionNonce, kek);

		privateKey = decryptKey(attributes.encryptedSecretKey, attributes.secretKeyDecryptionNonce, masterKey);

		const token = sodium.crypto_box_seal_open(
			fromBase64(authorization.encryptedToken),
			fromBase64(attributes.publicKey),
			privateKey
		);

		return {
			userID: authorization.id,
			masterKey: toBase64(masterKey),
			token: sodium.to_base64(token, sodium.base64_variants.URLSAFE),
		};
	} catch (error) {
		if (error instanceof CloudError && error.kind === "unsupported") {
			throw error;
		}

		throw new CloudError(
			"verification",
			"The password could not unlock this account. Check the password and try again."
		);
	} finally {
		if (kek) {
			sodium.memzero(kek);
		}

		if (privateKey) {
			sodium.memzero(privateKey);
		}
	}
}

export async function decryptSnapshot(snapshot: Snapshot, session: Session): Promise<Secret[]> {
	await sodium.ready;

	try {
		if (
			snapshot.apiOrigin !== session.apiOrigin ||
			normalizeAPIOrigin(snapshot.apiOrigin) !== snapshot.apiOrigin ||
			snapshot.sessionID !== session.id ||
			snapshot.userID !== session.userID
		) {
			throw invalidData();
		}

		if (!snapshot.key) {
			if (snapshot.records.length) {
				throw invalidData();
			}

			return [];
		}

		if (snapshot.key.userID !== session.userID) {
			throw invalidData();
		}

		const key = decryptKey(snapshot.key.encryptedKey, snapshot.key.header, fromBase64(session.masterKey));

		try {
			const entries: Secret[] = [];
			for (const record of snapshot.records) {
				if (record.isDeleted) {
					continue;
				}

				const secret = decryptRecord(record, key);
				if (secret) {
					entries.push({ ...secret, id: record.id });
				}
			}

			return entries;
		} finally {
			sodium.memzero(key);
		}
	} catch {
		throw invalidData();
	}
}

function decryptRecord(record: EncryptedRecord, key: Uint8Array): Secret | null {
	if (!record.header || !record.encryptedData) {
		throw invalidData();
	}

	const stream = sodium.crypto_secretstream_xchacha20poly1305_init_pull(fromBase64(record.header), key);
	const result = sodium.crypto_secretstream_xchacha20poly1305_pull(
		stream,
		fromBase64(record.encryptedData),
		null
	);
	if (!result) {
		throw invalidData();
	}

	const uri: unknown = JSON.parse(sodium.to_string(result.message));
	if (typeof uri !== "string") {
		throw invalidData();
	}

	return parseSecretURL(uri);
}
