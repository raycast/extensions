import { LocalStorage } from "@raycast/api";
import fse from "fs-extra";
import { getSecrets, parseSecrets, storeSecrets } from "../src/helpers/secrets";
import { STORAGE_KEY } from "../src/constants/secrets";
import db from "./__mocks__/db.json";

jest.mock("fs-extra");

const mockedReadFileSync = fse.readFileSync as jest.MockedFunction<typeof fse.readFileSync>;
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

	it("skips empty lines and invalid URLs", () => {
		const secrets = parseSecrets(["", "not-a-valid-url", validSecretUrl]);

		expect(secrets).toHaveLength(1);
		expect(secrets[0]?.issuer).toBe("GitHub");
	});

	it("strips formatting characters from the secret parameter", () => {
		const url =
			"otpauth://totp/user@example.com?secret=JBSW-Y3D-PEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30";
		const [secret] = parseSecrets([url]);

		expect(secret?.secret).toBe("JBSWY3DPEHPK3PXP");
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
