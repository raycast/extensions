import { normalizeAPIOrigin } from "../src/cloud/server";

describe("API origins", () => {
	it.each([
		[" HTTPS://API.EXAMPLE.COM:443/ ", "https://api.example.com"],
		["https://api.example.com:8443", "https://api.example.com:8443"],
		["http://localhost:8080", "http://localhost:8080"],
		["http://127.0.0.1:8080", "http://127.0.0.1:8080"],
		["http://[::1]:8080", "http://[::1]:8080"],
		["https://[2001:db8::1]", "https://[2001:db8::1]"],
	])("normalizes %s", (input, expected) => {
		expect(normalizeAPIOrigin(input)).toBe(expected);
	});
	it.each([
		"",
		"api.example.com",
		"//api.example.com",
		"ftp://api.example.com",
		"http://192.168.1.1",
		"http://localhost.example.com",
		"https://user:pass@api.example.com",
		"https://api.example.com?",
		"https://api.example.com#",
		"https://api.example.com/path",
		"https://api.example.com/..",
		"https://api.example.com/%2e",
		"https://api.example.com//",
		"https://api.example.com\\path",
		"https://api.exa mple.com",
		"https://api.example.com/\npath",
		"http://127.1",
		"http://2130706433",
	])("rejects %s", (input) => {
		expect(() => normalizeAPIOrigin(input)).toThrow();
	});
});
