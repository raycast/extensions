import { LocalStorage } from "@raycast/api";
import sodium from "libsodium-wrappers-sumo";
import { Authorization, Session, Snapshot } from "../src/cloud/types";
import { DEFAULT_API_ORIGIN } from "../src/cloud/server";

export const PASSWORD = "synthetic password, not a real account";
export const OTP_URI =
	"otpauth://totp/test%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Synthetic&algorithm=SHA256&digits=8&period=60";
const b64 = (value: Uint8Array) => sodium.to_base64(value, sodium.base64_variants.ORIGINAL);

export async function fixture(): Promise<{
	session: Session;
	snapshot: Snapshot;
	authorization: Authorization;
}> {
	await sodium.ready;
	const masterKey = new Uint8Array(32).fill(1);
	const authKey = new Uint8Array(32).fill(2);
	const nonce = new Uint8Array(24).fill(3);
	const salt = new Uint8Array(16).fill(4);
	const kek = sodium.crypto_pwhash(32, PASSWORD, salt, 1, 8192, sodium.crypto_pwhash_ALG_ARGON2ID13);
	const pair = sodium.crypto_box_seed_keypair(new Uint8Array(32).fill(5));
	const token = new Uint8Array(32).fill(255);
	const stream = sodium.crypto_secretstream_xchacha20poly1305_init_push(authKey);
	const encryptedData = sodium.crypto_secretstream_xchacha20poly1305_push(
		stream.state,
		JSON.stringify(OTP_URI),
		null,
		0
	);
	return {
		authorization: {
			id: 123,
			encryptedToken: b64(sodium.crypto_box_seal(token, pair.publicKey)),
			keyAttributes: {
				kekSalt: b64(salt),
				memLimit: 8192,
				opsLimit: 1,
				encryptedKey: b64(sodium.crypto_secretbox_easy(masterKey, nonce, kek)),
				keyDecryptionNonce: b64(nonce),
				publicKey: b64(pair.publicKey),
				encryptedSecretKey: b64(sodium.crypto_secretbox_easy(pair.privateKey, nonce, masterKey)),
				secretKeyDecryptionNonce: b64(nonce),
			},
		},
		session: {
			apiOrigin: DEFAULT_API_ORIGIN,
			id: "session-a",
			userID: 123,
			token: sodium.to_base64(token, sodium.base64_variants.URLSAFE),
			masterKey: b64(masterKey),
		},
		snapshot: {
			apiOrigin: DEFAULT_API_ORIGIN,
			sessionID: "session-a",
			userID: 123,
			key: {
				userID: 123,
				encryptedKey: b64(sodium.crypto_secretbox_easy(authKey, nonce, masterKey)),
				header: b64(nonce),
			},
			records: [
				{
					id: "entry-a",
					encryptedData: b64(encryptedData),
					header: b64(stream.header),
					isDeleted: false,
					updatedAt: 10,
				},
			],
			syncedAt: 1000,
		},
	};
}

export function mockFetch() {
	const fetchMock = jest.fn();
	global.fetch = fetchMock;
	return fetchMock;
}

export const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

export function mockStorage() {
	const items = new Map<string, string | number | boolean>();
	(LocalStorage.getItem as jest.Mock).mockImplementation(async (key: string) => items.get(key));
	(LocalStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
		items.set(key, value);
	});
	(LocalStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
		items.delete(key);
	});
	(LocalStorage.allItems as jest.Mock).mockImplementation(async () => Object.fromEntries(items));
	return items;
}
