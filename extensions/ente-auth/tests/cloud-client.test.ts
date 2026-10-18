import { request } from "../src/cloud/client";
import { DEFAULT_API_ORIGIN } from "../src/cloud/server";
import { CloudError, safeMessage } from "../src/cloud/errors";
import { fixture, mockFetch, response } from "./fixtures";

describe("cloud requests", () => {
	let fetchMock: ReturnType<typeof mockFetch>;
	beforeEach(() => {
		fetchMock = mockFetch();
	});

	it.each([DEFAULT_API_ORIGIN, "https://api.example.com:8443", "http://[::1]:8080"])(
		"routes requests only to %s",
		async (apiOrigin) => {
			const { session } = await fixture();
			fetchMock.mockImplementation(async () => response({}));
			await request("/users/ott", { apiOrigin, body: { email: "a@example.com" } });
			await request("/authenticator/key", { session: { ...session, apiOrigin } });
			expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
				apiOrigin + "/users/ott",
				apiOrigin + "/authenticator/key",
			]);
			expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("X-Auth-Token");
			expect(fetchMock.mock.calls[1][1].headers["X-Auth-Token"]).toBe(session.token);
		}
	);

	it("rejects missing destinations and session overrides before fetch", async () => {
		const { session } = await fixture();
		// @ts-expect-error Exercise a missing runtime destination.
		await expect(request("/users/ott")).rejects.toBeDefined();
		// @ts-expect-error Empty request options have no destination.
		await expect(request("/users/ott", {})).rejects.toBeDefined();
		await expect(
			// @ts-expect-error Sessions must contain an explicit origin.
			request("/authenticator/key", { session: { ...session, apiOrigin: undefined } })
		).rejects.toBeDefined();
		await expect(
			// @ts-expect-error Authenticated requests cannot have an origin override.
			request("/users/logout", { session, apiOrigin: "https://other.example.com" })
		).rejects.toBeDefined();
		await expect(
			request("/authenticator/key", { session: { ...session, apiOrigin: "" } })
		).rejects.toBeDefined();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each(["/", "/authenticator/key", "/users/srp/attributes?email=a%2Bb%40example.com", "/users/a%20b"])(
		"accepts internal path %s",
		async (path) => {
			const { session } = await fixture();
			fetchMock.mockResolvedValueOnce(response({}));
			await expect(request(path, { session })).resolves.toEqual({});
			expect(fetchMock.mock.calls[0][0]).toBe(session.apiOrigin + path);
		}
	);

	it.each([
		"",
		"https://other.example.com/users",
		"https://api.ente.com/users",
		"//other.example.com/users",
		"/\\other.example.com/users",
		"/users\\key",
		"users",
		" /users",
		"/users key",
		"/users\tkey",
		"/users\n",
		"/users\rkey",
		"/users\u2028key",
		"/users\ufeffkey",
	])("rejects unsafe internal path %j", async (path) => {
		const { session } = await fixture();
		await expect(request(path, { session })).rejects.toBeDefined();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each(["https://api.example.com/users", "https://other.example.com/users"])(
		"does not follow a redirect to %s",
		async (location) => {
			const { session } = await fixture();
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: location } }));
			await expect(
				request("/authenticator/key", { session: { ...session, apiOrigin: "https://api.example.com" } })
			).rejects.toBeDefined();
			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(fetchMock.mock.calls[0][1].redirect).toBe("error");
		}
	);

	it.each([401, 403])("reports authenticated HTTP %s", async (status) => {
		const { session } = await fixture();
		fetchMock.mockResolvedValueOnce(response({ error: "sensitive server details" }, status));
		await expect(request("/authenticator/key", { session })).rejects.toMatchObject({
			kind: status === 401 ? "unauthorized" : "verification",
		});
		expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
			"X-Client-Package": "io.ente.auth",
			"X-Auth-Token": session.token,
		});
		expect(fetchMock.mock.calls[0][1].redirect).toBe("error");
	});

	it.each(["connection", "timeout", "server", "invalid-json"])(
		"returns a safe error for %s failures",
		async (failure) => {
			if (failure === "connection" || failure === "timeout") {
				fetchMock.mockRejectedValueOnce(new Error("token and full OTP URI must not escape"));
			} else if (failure === "server") {
				fetchMock.mockResolvedValueOnce(response({}, 500));
			} else {
				fetchMock.mockResolvedValueOnce(new Response("not JSON"));
			}

			let error: unknown;
			try {
				await request("/authenticator/key", { apiOrigin: DEFAULT_API_ORIGIN });
			} catch (caught) {
				error = caught;
			}
			expect(error).toBeInstanceOf(CloudError);
			expect(safeMessage(error)).not.toContain("token and full OTP URI");
		}
	);

	it("maps cancellation to a safe error and accepts empty successful POST bodies", async () => {
		const controller = new AbortController();
		controller.abort();
		fetchMock.mockRejectedValueOnce(new Error("aborted"));
		await expect(
			request("/users/ott", { apiOrigin: DEFAULT_API_ORIGIN, signal: controller.signal })
		).rejects.toMatchObject({
			kind: "cancelled",
		});
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
		await expect(request("/users/ott", { apiOrigin: DEFAULT_API_ORIGIN, body: {} })).resolves.toBeNull();
	});
});
