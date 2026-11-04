import { SRP, SrpClient } from "fast-srp-hap";
import sodium from "libsodium-wrappers-sumo";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { CloudError } from "./errors";

// Ente uses the RFC 5054 4096-bit group, SHA-256, and the non-HAP proofs.
export function createSRPClient(
	identity: string,
	salt: Uint8Array,
	loginKey: Uint8Array,
	secret = randomBytes(64)
): SrpClient {
	const password = Buffer.from(loginKey);

	try {
		return new SrpClient(
			{ ...SRP.params[4096], hash: "sha256" },
			Buffer.from(salt),
			Buffer.from(identity),
			password,
			secret,
			false
		);
	} finally {
		password.fill(0);
		secret.fill(0);
	}
}

export function deriveLoginKey(key: Uint8Array): Buffer {
	const subkey = sodium.crypto_kdf_derive_from_key(32, 1, "loginctx", key);

	try {
		return Buffer.from(subkey.subarray(0, 16));
	} finally {
		sodium.memzero(subkey);
	}
}

export function verifyServerProof(client: SrpClient, proof: Uint8Array): void {
	const expected = createHash("sha256")
		.update(client.computeA())
		.update(client.computeM1())
		.update(client.computeK())
		.digest();
	if (proof.length !== expected.length || !timingSafeEqual(expected, proof)) {
		throw new CloudError("verification", "Ente password verification could not be confirmed. Try again.");
	}
}
