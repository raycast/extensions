export interface Session {
	readonly apiOrigin: string;
	id: string;
	userID: number;
	token: string;
	masterKey: string;
}

export interface AuthKey {
	userID: number;
	encryptedKey: string;
	header: string;
}

export interface EncryptedRecord {
	id: string;
	encryptedData: string | null;
	header: string | null;
	isDeleted: boolean;
	updatedAt: number;
}

export interface Snapshot {
	readonly apiOrigin: string;
	sessionID: string;
	userID: number;
	key: AuthKey | null;
	records: EncryptedRecord[];
	syncedAt: number;
}

export interface KeyAttributes {
	kekSalt: string;
	memLimit: number;
	opsLimit: number;
	encryptedKey: string;
	keyDecryptionNonce: string;
	publicKey: string;
	encryptedSecretKey: string;
	secretKeyDecryptionNonce: string;
}

export type PasswordKeyAttributes = Pick<KeyAttributes, "kekSalt" | "memLimit" | "opsLimit">;

export interface PasswordKey extends PasswordKeyAttributes {
	key: Uint8Array;
}

export interface SRPAttributes extends PasswordKeyAttributes {
	srpUserID: string;
	srpSalt: string;
	isEmailMFAEnabled: boolean;
}

export interface SignInContext {
	readonly id: string;
	readonly apiOrigin: string;
}

export interface SignInAttempt extends SignInContext {
	authorization?: Authorization;
	passwordKey?: PasswordKey;
}

export interface Authorization {
	id: number;
	keyAttributes?: KeyAttributes;
	encryptedToken?: string;
	twoFactorSessionID?: string;
	twoFactorSessionIDV2?: string;
	passkeySessionID?: string;
}

export type SyncStatus = "Syncing" | "Up to date" | "Offline" | "Sign-in required" | "Sync failed";
