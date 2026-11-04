import { mapSecretsToJsonFormat } from "../src/helpers";
import { parseSecrets } from "../src/helpers/secrets";
import { generateTotpCodes } from "../src/helpers/totp";
import type { Secret } from "../src/helpers/types";

// Public RFC 6238 SHA-256 test secret, not a real account secret.
const TEST_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA";

const entry = (overrides: Partial<Secret> = {}): Secret => ({
	username: "user@example.test",
	issuer: "Example",
	algorithm: "SHA256",
	digits: 8,
	period: "30",
	tags: [],
	notes: "",
	secret: TEST_SECRET,
	...overrides,
});

describe("generateTotpCodes", () => {
	it("matches the RFC 6238 SHA-256 test vector", () => {
		const result = generateTotpCodes(entry(), 59_000);
		expect(result.currentTotp).toBe("46119246");
		expect(result.currentTotpTimeRemaining).toBe(1);
		expect(result.nextTotp).toBe("30882438");
	});

	it("generates six-digit SHA-256 codes", () => {
		expect(generateTotpCodes(entry({ digits: 6 }), 59_000).currentTotp).toBe("119246");
	});

	it("supports a 32-character Base32 secret with SHA-256", () => {
		const result = generateTotpCodes(
			entry({ secret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", digits: 6 }),
			59_000
		);
		expect(result.currentTotp).toBe("247374");
	});

	it("uses the imported period for the next code and countdown", () => {
		const result = generateTotpCodes(entry({ digits: 6, period: "60" }), 61_000);
		expect(result.currentTotp).toBe("119246");
		expect(result.nextTotp).toBe("882438");
		expect(result.currentTotpTimeRemaining).toBe(59);
		expect(result.period).toBe(60);
	});

	it("falls back to SHA-1, six digits, and a 30-second period for empty metadata", () => {
		const result = generateTotpCodes(entry({ algorithm: "", digits: 0, period: "" }), 59_000);
		expect(result.currentTotp).toBe("599872");
		expect(result.period).toBe(30);
	});

	it("keeps support for SHA-512 and eight-digit codes", () => {
		expect(generateTotpCodes(entry({ algorithm: "SHA512" }), 59_000).currentTotp).toBe("53754366");
	});
});

describe("imported TOTP settings", () => {
	it("preserves SHA-256 from the Ente export through code generation and display", () => {
		const url =
			`otpauth://totp/user@example.test?secret=${TEST_SECRET}&issuer=Example` +
			"&algorithm=SHA256&digits=6&period=30";
		const [imported] = parseSecrets([url]);
		expect(imported).toMatchObject({ algorithm: "SHA256", digits: 6, period: "30" });
		expect(generateTotpCodes(imported, 59_000).currentTotp).toBe("119246");

		jest.useFakeTimers().setSystemTime(59_000);
		try {
			const [display] = mapSecretsToJsonFormat([imported]);
			expect(display).toMatchObject({
				algorithm: "SHA256",
				digits: 6,
				period: "30",
				current_totp: "119246",
				current_totp_time_remaining: 1,
			});
		} finally {
			jest.useRealTimers();
		}
	});
});
