import { execFileSync } from "child_process";
import fse from "fs-extra";
import os from "os";
import path from "path";
import { checkEnteBinary, exportEnteAuthSecrets, parseEnteCliVersion } from "../src/helpers/ente";

jest.mock("child_process", () => ({ execFileSync: jest.fn() }));
jest.mock("@raycast/api", () => ({
	getPreferenceValues: jest.fn(() => ({ cliPath: "C:/ente/ente.exe" })),
	trash: jest.fn(),
}));

const mockedExec = execFileSync as jest.MockedFunction<typeof execFileSync>;

// Representative output of `ente account list --json` (Ente CLI 0.4+).
const accountListJson = JSON.stringify([
	{
		id: "1",
		name: "photos@example.com",
		email: "photos@example.com",
		host: "https://api.ente.com",
		apps: ["photos"],
		selected: false,
	},
	{
		id: "2",
		name: "auth@example.com",
		email: "auth@example.com",
		host: "https://api.ente.com",
		apps: ["auth"],
		selected: true,
	},
]);

const exportedLine = "otpauth://totp/user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub";

// Routes the account list call to fixed JSON and the auth export call to a custom handler.
const mockCli = (exportHandler: (outputPath: string) => void) => {
	mockedExec.mockImplementation(((_file: string, args: string[]) => {
		if (args[0] === "--version") {
			return "ente 0.4.5\n";
		}
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

beforeEach(() => {
	mockedExec.mockReset();
});

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

		expect(mockedExec).toHaveBeenNthCalledWith(1, "C:/ente/ente.exe", ["--version"], expect.anything());
		expect(mockedExec).toHaveBeenNthCalledWith(
			2,
			"C:/ente/ente.exe",
			["account", "list", "--json"],
			expect.anything()
		);
		expect(mockedExec).toHaveBeenNthCalledWith(
			3,
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
		mockedExec.mockImplementation(((_file: string, args: string[]) =>
			args[0] === "--version"
				? "ente 0.4.5\n"
				: JSON.stringify([
						{ id: "1", name: "photos@example.com", email: "photos@example.com", apps: ["photos"] },
					])) as unknown as typeof execFileSync);

		expect(() => exportEnteAuthSecrets(exportDir)).toThrow("Auth account not found in Ente CLI");
		expect(fse.existsSync(exportFile)).toBe(false);
	});
});

// Ente CLI <= 0.3 has no `--version` flag, only a `version` subcommand, and a text `account list`.
const mockLegacyCli = (exportDir: string, version = "Version v0.3.0\n") => {
	mockedExec.mockImplementation(((_file: string, args: string[]) => {
		if (args[0] === "--version") {
			throw new Error("unknown flag: --version");
		}
		if (args[0] === "version") {
			return version;
		}
		if (args[0] === "account" && args[1] === "list") {
			return [
				"Configured accounts: 1",
				"====================================",
				"Email:     auth@example.com",
				"ID:        2",
				"App:       auth",
				`ExportDir: ${exportDir}`,
				"====================================",
			].join("\n");
		}
		if (args[0] === "account" && args[1] === "update") {
			return "";
		}
		if (args[0] === "export") {
			return "";
		}
		throw new Error(`unexpected CLI call: ${args.join(" ")}`);
	}) as unknown as typeof execFileSync);
};

describe("exportEnteAuthSecrets with Ente CLI < 0.4", () => {
	let exportDir: string;

	beforeEach(() => {
		exportDir = fse.mkdtempSync(path.join(os.tmpdir(), "ente-auth-legacy-test-"));
	});

	afterEach(() => {
		fse.removeSync(exportDir);
	});

	it("uses the legacy `export` command", () => {
		mockLegacyCli(exportDir);

		expect(exportEnteAuthSecrets(exportDir)).toBe(true);

		const calls = mockedExec.mock.calls.map(([, args]) => args);
		expect(calls).toEqual([["--version"], ["version"], ["account", "list"], ["export"]]);
	});

	it("updates the export dir when it differs from the configured one", () => {
		mockLegacyCli("/some/other/dir");

		exportEnteAuthSecrets(exportDir);

		expect(mockedExec).toHaveBeenCalledWith(
			"C:/ente/ente.exe",
			["account", "update", "--app", "auth", "--email", "auth@example.com", "--dir", exportDir],
			expect.anything()
		);
		expect(mockedExec).toHaveBeenLastCalledWith("C:/ente/ente.exe", ["export"], expect.anything());
	});
});

describe("checkEnteBinary", () => {
	it("accepts Ente CLI 0.4+ (`--version`)", () => {
		mockedExec.mockReturnValue("ente 0.4.5\n");
		expect(checkEnteBinary()).toBe(true);
	});

	it("accepts Ente CLI < 0.4 (`version`)", () => {
		mockLegacyCli("/tmp");
		expect(checkEnteBinary()).toBe(true);
	});

	it("fails when the binary is missing", () => {
		mockedExec.mockImplementation(() => {
			throw new Error("ENOENT");
		});
		expect(checkEnteBinary()).toBe(false);
	});
});

describe("parseEnteCliVersion", () => {
	it.each([
		["Version v0.3.0", [0, 3, 0]],
		["Version v0.2.3\n", [0, 2, 3]],
		["ente 0.4.5", [0, 4, 5]],
		["ente 1.0", [1, 0, 0]],
		["garbage", null],
	])("parses %j", (output, expected) => {
		expect(parseEnteCliVersion(output)).toEqual(expected);
	});
});
