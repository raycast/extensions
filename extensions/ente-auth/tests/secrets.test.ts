import { LocalStorage } from "@raycast/api";
import { readFileSync } from "node:fs";
import { getSecrets, parseSecrets, storeSecrets } from "../src/helpers/secrets";
import { STORAGE_KEY } from "../src/constants/secrets";
import { mapSecretsToJsonFormat } from "../src/helpers";
import db from "./__mocks__/db.json";

jest.mock("node:fs");

const mockedReadFileSync = jest.mocked(readFileSync);
const mockedSetItem = LocalStorage.setItem as jest.MockedFunction<typeof LocalStorage.setItem>;

const validSecretUrl =
	"otpauth://totp/user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30";

describe("parseSecrets", () => {
	it("parses a valid otpauth URL", () => {
		const [secret] = parseSecrets([validSecretUrl]);

		expect(secret).toMatchObject({
			username: "user@example.com",
			issuer: "GitHub",
			algorithm: "SHA1",
			digits: 6,
			period: "30",
			secret: "JBSWY3DPEHPK3PXP",
			tags: [],
			notes: "",
		});
	});

	it("parses tags and notes from codeDisplay", () => {
		const codeDisplay = encodeURIComponent(JSON.stringify({ tags: [" work ", "personal"], note: "my note" }));
		const url = `${validSecretUrl}&codeDisplay=${codeDisplay}`;
		const [secret] = parseSecrets([url]);

		expect(secret?.tags).toEqual(["work", "personal"]);
		expect(secret?.notes).toBe("my note");
	});

	it("skips trashed entries", () => {
		const codeDisplay = encodeURIComponent(JSON.stringify({ trashed: true }));
		const url = `${validSecretUrl}&codeDisplay=${codeDisplay}`;

		expect(parseSecrets([url])).toEqual([]);
	});

	it("accepts null notes and tags and preserves a custom digit count", () => {
		const codeDisplay = encodeURIComponent(JSON.stringify({ note: null, tags: null, trashed: null }));
		const [secret] = parseSecrets([
			`${validSecretUrl.replace("digits=6", "digits=5")}&codeDisplay=${codeDisplay}`,
		]);
		expect(secret).toMatchObject({ notes: "", tags: [], digits: 5 });
	});

	it("skips empty lines and invalid URLs", () => {
		const log = jest.spyOn(console, "error").mockImplementation(() => undefined);
		const secrets = parseSecrets(["", "not-a-valid-url", validSecretUrl]);

		expect(secrets).toHaveLength(1);
		expect(secrets[0]?.issuer).toBe("GitHub");
		expect(log).toHaveBeenCalledWith("An import entry could not be read.");
		log.mockRestore();
	});

	it("strips formatting characters from the secret parameter", () => {
		const url =
			"otpauth://totp/user@example.com?secret=JBSW-Y3D-PEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30";
		const [secret] = parseSecrets([url]);

		expect(secret?.secret).toBe("JBSWY3DPEHPK3PXP");
	});

	it("normalizes URI-encoded secret formatting and Ente algorithm names", () => {
		const url = validSecretUrl
			.replace("JBSWY3DPEHPK3PXP", "JBSW%20Y3DP%2BEHPK-3PXP")
			.replace("SHA1", "Algorithm.sha256");
		expect(parseSecrets([url])[0]).toMatchObject({ secret: "JBSWY3DPEHPK3PXP", algorithm: "SHA256" });
	});

	it("fixes HTML entity corruption in export URLs", () => {
		const url =
			"otpauth://totp/user@example.com?secret=JBSWY3DPEHPK3PXP&amp%3Bissuer=GitHub&algorithm=SHA1&digits=6&period=30";
		const [secret] = parseSecrets([url]);

		expect(secret).toMatchObject({
			username: "user@example.com",
			issuer: "GitHub",
			secret: "JBSWY3DPEHPK3PXP",
		});
	});

	it("parses URLs with null period by using the default period", () => {
		const url =
			"otpauth://totp/user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=null";
		const [secret] = parseSecrets([url]);

		expect(secret).toMatchObject({
			issuer: "GitHub",
			algorithm: "SHA1",
			digits: 6,
			period: "30",
		});
	});

	it("parses URLs with null algorithm, digits, and period by using defaults", () => {
		const url =
			"otpauth://totp/user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=null&digits=null&period=null";
		const [secret] = parseSecrets([url]);

		expect(secret).toMatchObject({
			issuer: "GitHub",
			algorithm: "SHA1",
			digits: 6,
			period: "30",
		});
	});
});

describe("getSecrets", () => {
	it("reads a file and splits it into lines", () => {
		mockedReadFileSync.mockReturnValue(`${validSecretUrl}\n\nsecond-line`);

		expect(getSecrets("/tmp/ente_auth.txt")).toEqual([validSecretUrl, "", "second-line"]);
		expect(mockedReadFileSync).toHaveBeenCalledWith("/tmp/ente_auth.txt", "utf8");
	});
});

describe("storeSecrets", () => {
	it("persists secrets to LocalStorage", async () => {
		await storeSecrets(db);

		expect(mockedSetItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(db));
	});
});

describe("TOTP codes", () => {
	it.each([
		["SHA1", "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "94287082"],
		["SHA256", "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA", "46119246"],
		[
			"SHA512",
			"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA",
			"90693936",
		],
	])("matches the RFC 6238 %s vector", (algorithm, secret, expected) => {
		const entries = parseSecrets([
			`otpauth://totp/test?secret=${secret}&algorithm=${algorithm}&digits=8&period=30`,
		]);
		expect(mapSecretsToJsonFormat(entries, 59_000)[0].current_totp).toBe(expected);
	});

	it("uses the entry period for next codes and countdowns", () => {
		const entries = parseSecrets([
			"otpauth://totp/test?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&digits=8&period=60",
		]);
		expect(mapSecretsToJsonFormat(entries, 89_000)[0]).toMatchObject({
			current_totp: "94287082",
			next_totp: "37359152",
			current_totp_time_remaining: 31,
		});
	});
});
