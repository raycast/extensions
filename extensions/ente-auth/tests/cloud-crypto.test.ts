import { decryptSnapshot, unlockAuthorization } from "../src/cloud/crypto";
import { fixture, OTP_URI, PASSWORD } from "./fixtures";

describe("Ente-compatible snapshot decryption", () => {
	it.each([0, 1, 2, 3])("reads a JSON OTP URI with secretstream tag %s", async (tag) => {
		const { session, snapshot } = await fixture(tag);
		await expect(decryptSnapshot(snapshot, session)).resolves.toEqual([
			expect.objectContaining({
				issuer: "Synthetic",
				username: "test@example.com",
				secret: "JBSWY3DPEHPK3PXP",
				algorithm: "SHA256",
				digits: 8,
				period: "60",
			}),
		]);
	});
	it("unlocks account keys and the URL-safe token without changing the password", async () => {
		const { authorization, session } = await fixture();
		await expect(unlockAuthorization(authorization, PASSWORD)).resolves.toEqual({
			userID: session.userID,
			token: session.token,
			masterKey: session.masterKey,
		});
		await expect(unlockAuthorization(authorization, "wrong password")).rejects.toMatchObject({
			kind: "verification",
		});
	});
	it("rejects a changed ciphertext with valid base64 and excessive password-key work", async () => {
		const { session, snapshot, authorization } = await fixture();
		const bytes = Buffer.from(snapshot.records[0].encryptedData!, "base64");
		bytes[5] ^= 1;
		snapshot.records[0].encryptedData = bytes.toString("base64");
		await expect(decryptSnapshot(snapshot, session)).rejects.toMatchObject({ kind: "invalid" });
		authorization.keyAttributes!.memLimit = 2 * 1024 ** 3;
		await expect(unlockAuthorization(authorization, PASSWORD)).rejects.toMatchObject({ kind: "unsupported" });
	});
	it.each(["userID", "sessionID", "ciphertext", "header", "key", "uri"])(
		"rejects invalid %s without token data in the error",
		async (field) => {
			const { session, snapshot } = await fixture(0, field === "uri" ? "not an OTP URI" : undefined);
			if (field === "userID") {
				snapshot.userID++;
			}

			if (field === "sessionID") {
				snapshot.sessionID = "other";
			}

			if (field === "ciphertext") {
				snapshot.records[0].encryptedData = "invalid";
			}

			if (field === "header") {
				snapshot.records[0].header = "invalid";
			}

			if (field === "key") {
				snapshot.key!.encryptedKey = "invalid";
			}

			await expect(decryptSnapshot(snapshot, session)).rejects.toMatchObject({ kind: "invalid" });
		}
	);
	it("skips deleted and trashed entries", async () => {
		const { session, snapshot } = await fixture(
			0,
			`${OTP_URI}&codeDisplay=${encodeURIComponent(JSON.stringify({ trashed: true }))}`
		);
		await expect(decryptSnapshot(snapshot, session)).resolves.toEqual([]);
		snapshot.records = [{ id: "deleted", isDeleted: true, updatedAt: 10, encryptedData: null, header: null }];
		await expect(decryptSnapshot(snapshot, session)).resolves.toEqual([]);
	});
	it.each(["hotp", "steam"])("skips %s entries without blocking TOTP entries", async (type) => {
		const { session, snapshot } = await fixture();
		const unsupported = await fixture(0, OTP_URI.replace("totp/", `${type}/`) + "&counter=0");
		snapshot.records.push({ ...unsupported.snapshot.records[0], id: "unsupported" });
		await expect(decryptSnapshot(snapshot, session)).resolves.toEqual([
			expect.objectContaining({ id: "entry-a", issuer: "Synthetic" }),
		]);
	});
});
