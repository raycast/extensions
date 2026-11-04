import { CloudError, invalidData } from "./errors";
import { AuthKey, Authorization, EncryptedRecord, KeyAttributes, SRPAttributes } from "./types";

export function storedObject(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw invalidData();
	}
	return value as Record<string, unknown>;
}

export function object(value: unknown): Record<string, unknown> {
	const result = storedObject(value);
	// Ente API responses have their own protocol version.
	if (result.version !== undefined && result.version !== 1) {
		throw new CloudError(
			"unsupported",
			"This data version is not supported. Update the extension or use the Ente app."
		);
	}

	return result;
}

export function text(value: unknown): string {
	if (typeof value !== "string" || !value.length || value.length > 2_000_000) {
		throw invalidData();
	}

	return value;
}

export function integer(value: unknown, minimum = 0): number {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
		throw invalidData();
	}

	return value;
}

export function readKey(value: unknown): AuthKey {
	const key = object(value);

	return { userID: integer(key.userID, 1), encryptedKey: text(key.encryptedKey), header: text(key.header) };
}

export function readRecord(value: unknown): EncryptedRecord {
	const record = object(value);
	if (typeof record.isDeleted !== "boolean") {
		throw invalidData();
	}

	return {
		id: text(record.id),
		encryptedData: record.isDeleted ? null : text(record.encryptedData),
		header: record.isDeleted ? null : text(record.header),
		isDeleted: record.isDeleted,
		updatedAt: integer(record.updatedAt, 1),
	};
}

function readKeyAttributes(value: unknown): KeyAttributes {
	const attributes = object(value);

	return {
		kekSalt: text(attributes.kekSalt),
		memLimit: integer(attributes.memLimit, 8192),
		opsLimit: integer(attributes.opsLimit, 1),
		encryptedKey: text(attributes.encryptedKey),
		keyDecryptionNonce: text(attributes.keyDecryptionNonce),
		publicKey: text(attributes.publicKey),
		encryptedSecretKey: text(attributes.encryptedSecretKey),
		secretKeyDecryptionNonce: text(attributes.secretKeyDecryptionNonce),
	};
}

export function readAuthorization(value: unknown): Authorization {
	const response = object(value);
	const result: Authorization = { id: integer(response.id, 1) };

	if (response.keyAttributes) {
		result.keyAttributes = readKeyAttributes(response.keyAttributes);
	}

	for (const field of [
		"encryptedToken",
		"twoFactorSessionID",
		"twoFactorSessionIDV2",
		"passkeySessionID",
	] as const) {
		if (response[field]) {
			result[field] = text(response[field]);
		}
	}

	if (
		!(result.encryptedToken && result.keyAttributes) &&
		!result.twoFactorSessionID &&
		!result.twoFactorSessionIDV2 &&
		!result.passkeySessionID
	) {
		throw invalidData();
	}

	return result;
}

export function readSRPAttributes(value: unknown): SRPAttributes {
	const attributes = object(object(value).attributes);
	if (typeof attributes.isEmailMFAEnabled !== "boolean") {
		throw invalidData();
	}

	const srpUserID = text(attributes.srpUserID);
	if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(srpUserID)) {
		throw invalidData();
	}

	return {
		srpUserID,
		srpSalt: text(attributes.srpSalt),
		kekSalt: text(attributes.kekSalt),
		memLimit: integer(attributes.memLimit, 8192),
		opsLimit: integer(attributes.opsLimit, 1),
		isEmailMFAEnabled: attributes.isEmailMFAEnabled,
	};
}
