import { mapSecretsToJsonFormat } from "../src/helpers";
import { Secret } from "../src/helpers/types";

describe("TOTP parameters", () => {
	afterEach(() => jest.restoreAllMocks());
	it.each([
		["SHA1", "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "94287082"],
		["SHA256", "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA", "46119246"],
		[
			"SHA512",
			"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA",
			"90693936",
		],
	])("uses the RFC 6238 %s vector and eight digits", (algorithm, secret, expected) => {
		jest.spyOn(Date, "now").mockReturnValue(59_000);
		const entry: Secret = {
			issuer: "RFC",
			username: "test",
			algorithm,
			digits: 8,
			period: "30",
			secret,
			tags: [],
			notes: "",
		};
		expect(mapSecretsToJsonFormat([entry])[0].current_totp).toBe(expected);
	});
	it("uses each entry's period for next codes and countdowns", () => {
		jest.spyOn(Date, "now").mockReturnValue(89_000);
		const entry: Secret = {
			issuer: "RFC",
			username: "test",
			algorithm: "SHA1",
			digits: 8,
			period: "60",
			secret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
			tags: [],
			notes: "",
		};
		const result = mapSecretsToJsonFormat([entry])[0];
		expect(result.current_totp).toBe("94287082");
		expect(result.next_totp).toBe("37359152");
		expect(result.current_totp_time_remaining).toBe(31);
	});
});
