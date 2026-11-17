import { execFileSync } from "child_process";
import fse from "fs-extra";
import os from "os";
import path from "path";
import { exportEnteAuthSecrets } from "../src/helpers/ente";

jest.mock("child_process", () => ({ execFileSync: jest.fn() }));
jest.mock("@raycast/api", () => ({
	getPreferenceValues: jest.fn(() => ({ cliPath: "C:/ente/ente.exe" })),
	trash: jest.fn(),
}));

const mockedExec = execFileSync as jest.MockedFunction<typeof execFileSync>;

// Representative output of `ente account list --json` (Ente CLI 0.4+).
const accountListJson = JSON.stringify([
	{ id: "1", name: "photos@example.com", email: "photos@example.com", host: "https://api.ente.com", apps: ["photos"], selected: false },
	{ id: "2", name: "auth@example.com", email: "auth@example.com", host: "https://api.ente.com", apps: ["auth"], selected: true },
]);

const exportedLine = "otpauth://totp/user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub";

// Routes the account list call to fixed JSON and the auth export call to a custom handler.
const mockCli = (exportHandler: (outputPath: string) => void) => {
	mockedExec.mockImplementation(((_file: string, args: string[]) => {
		if (args[0] === "account") {
			return accountListJson;
		}
		if (args[0] === "auth" && args[1] === "export") {
			exportHandler(args[args.indexOf("--output") + 1]);
			return "";
		}
		throw new Error(`unexpected CLI call: ${args.join(" ")}`);
	}) as unknown as typeof execFileSync);
};

describe("exportEnteAuthSecrets", () => {
	let exportDir: string;
	let exportFile: string;
	let tempFile: string;

	beforeEach(() => {
		exportDir = fse.mkdtempSync(path.join(os.tmpdir(), "ente-auth-test-"));
		exportFile = path.join(exportDir, "ente_auth.txt");
		tempFile = `${exportFile}.tmp`;
	});

	afterEach(() => {
		fse.removeSync(exportDir);
	});

	it("exports the auth account to a temporary file and then replaces the export", () => {
		mockCli((outputPath) => fse.writeFileSync(outputPath, `${exportedLine}\n`));

		exportEnteAuthSecrets(exportDir);

		expect(mockedExec).toHaveBeenNthCalledWith(1, "C:/ente/ente.exe", ["account", "list", "--json"], expect.anything());
		expect(mockedExec).toHaveBeenNthCalledWith(
			2,
			"C:/ente/ente.exe",
			["auth", "export", "--plaintext", "--no-input", "--output", tempFile, "--account", "auth@example.com"],
			expect.anything()
		);
		expect(fse.readFileSync(exportFile, "utf8")).toBe(`${exportedLine}\n`);
		expect(fse.existsSync(tempFile)).toBe(false);
	});

	it("keeps the previous export when the CLI export fails", () => {
		fse.writeFileSync(exportFile, "previous export\n");
		mockCli(() => {
			throw new Error("network error");
		});

		expect(() => exportEnteAuthSecrets(exportDir)).toThrow("Export failed. network error");
		expect(fse.readFileSync(exportFile, "utf8")).toBe("previous export\n");
		expect(fse.existsSync(tempFile)).toBe(false);
	});

	it("fails clearly when no account is logged in to the auth app", () => {
		mockedExec.mockImplementation((() =>
			JSON.stringify([{ id: "1", name: "photos@example.com", email: "photos@example.com", apps: ["photos"] }])) as unknown as typeof execFileSync);

		expect(() => exportEnteAuthSecrets(exportDir)).toThrow("Auth account not found in Ente CLI");
		expect(fse.existsSync(exportFile)).toBe(false);
	});
});
