import { LocalStorage, getPreferenceValues } from "@raycast/api";

import { StarLineClient } from "./client";
import { LOCAL_STORAGE } from "./constants";

class TestStarLineClient extends StarLineClient {
    protected auth() {
        return Promise.resolve({ userId: "1", slnetUserToken: "token" });
    }

    callRequest<T>(url = "https://example.test") {
        return this.request<T>(url);
    }
}

class FullAuthStarLineClient extends StarLineClient {
    callAuth() {
        return this.auth();
    }

    callRequest<T>(url = "https://example.test") {
        return this.request<T>(url);
    }
}

const jsonResponse = (data: unknown, headers?: { getSetCookie: () => string[] }) =>
    ({ json: () => Promise.resolve(data), headers }) as never;

const slnetHeaders = (cookie: string) => ({ getSetCookie: () => [cookie] });

const textResponse = (status: number, text: string) => ({ status, text: () => Promise.resolve(text) }) as never;

describe("StarLineClient", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await StarLineClient.clearAuthCache();
        jest.mocked(getPreferenceValues).mockReturnValue({
            AppId: "app-1",
            Secret: "secret-1",
            Login: "login-1",
            Password: "password-1",
        });
    });

    it("turns non-JSON API errors into displayable errors", async () => {
        jest.mocked(fetch).mockResolvedValue({
            status: 500,
            text: () => Promise.resolve("upstream unavailable"),
        } as never);

        await expect(new TestStarLineClient().callRequest()).rejects.toThrow("upstream unavailable");
    });

    it("rejects API envelopes with unsuccessful codes even when HTTP status is 200", async () => {
        jest.mocked(fetch).mockResolvedValue({
            status: 200,
            text: () => Promise.resolve(JSON.stringify({ code: 500, codestring: "failed" })),
        } as never);

        await expect(new TestStarLineClient().callRequest()).rejects.toThrow("failed");
    });

    it("does not persist auth bearer tokens or cookies in LocalStorage", async () => {
        jest.mocked(LocalStorage.getItem).mockResolvedValue(undefined);
        jest.mocked(fetch)
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { code: "app-code" } }))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { token: "app-token" } }))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { user_token: "slid-token" } }))
            .mockResolvedValueOnce(jsonResponse({ user_id: "user-1" }, slnetHeaders("slnet=slnet-cookie; Path=/")))
            .mockResolvedValueOnce(textResponse(200, JSON.stringify({ code: 200 })));

        await new FullAuthStarLineClient().callRequest();

        expect(jest.mocked(LocalStorage.setItem).mock.calls).toEqual([[LOCAL_STORAGE.USER_ID, "user-1"]]);
    });

    it("only clears persisted auth metadata from LocalStorage", async () => {
        jest.clearAllMocks();

        await StarLineClient.clearAuthCache();

        expect(jest.mocked(LocalStorage.removeItem).mock.calls).toEqual([
            [LOCAL_STORAGE.CAPTCHA_SID],
            [LOCAL_STORAGE.CAPTCHA_IMG],
            [LOCAL_STORAGE.USER_ID],
        ]);
    });

    it("keeps cached SLNet user ids scoped to the matching preferences", async () => {
        jest.mocked(LocalStorage.getItem).mockResolvedValue("user-2");
        jest.mocked(fetch)
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { code: "app-code-1" } }))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { token: "app-token-1" } }))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { user_token: "slid-token-1" } }))
            .mockResolvedValueOnce(jsonResponse({ user_id: "user-1" }, slnetHeaders("slnet=slnet-cookie-1; Path=/")))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { code: "app-code-2" } }))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { token: "app-token-2" } }))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { user_token: "slid-token-2" } }))
            .mockResolvedValueOnce(jsonResponse({ user_id: "user-2" }, slnetHeaders("slnet=slnet-cookie-2; Path=/")));

        await new FullAuthStarLineClient().callAuth();

        jest.mocked(getPreferenceValues).mockReturnValue({
            AppId: "app-2",
            Secret: "secret-2",
            Login: "login-2",
            Password: "password-2",
        });
        await new FullAuthStarLineClient().callAuth();

        jest.mocked(getPreferenceValues).mockReturnValue({
            AppId: "app-1",
            Secret: "secret-1",
            Login: "login-1",
            Password: "password-1",
        });

        await expect(new FullAuthStarLineClient().callAuth()).resolves.toEqual({
            userId: "user-1",
            slnetUserToken: "slnet-cookie-1",
        });
    });

    it("does not reuse cached app credentials after preferences change", async () => {
        jest.mocked(LocalStorage.getItem).mockResolvedValue(undefined);
        jest.mocked(fetch)
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { code: "app-code-1" } }))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { token: "app-token-1" } }))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { user_token: "slid-token-1" } }))
            .mockResolvedValueOnce(jsonResponse({ user_id: "user-1" }, slnetHeaders("slnet=slnet-cookie-1; Path=/")))
            .mockResolvedValueOnce(textResponse(200, JSON.stringify({ code: 200 })))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { code: "app-code-2" } }))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { token: "app-token-2" } }))
            .mockResolvedValueOnce(jsonResponse({ state: 1, desc: { user_token: "slid-token-2" } }))
            .mockResolvedValueOnce(jsonResponse({ user_id: "user-2" }, slnetHeaders("slnet=slnet-cookie-2; Path=/")))
            .mockResolvedValueOnce(textResponse(200, JSON.stringify({ code: 200 })));

        await new FullAuthStarLineClient().callRequest("https://example.test/first");

        jest.mocked(getPreferenceValues).mockReturnValue({
            AppId: "app-2",
            Secret: "secret-2",
            Login: "login-2",
            Password: "password-2",
        });

        await new FullAuthStarLineClient().callRequest("https://example.test/second");

        const fetchUrls = jest.mocked(fetch).mock.calls.map(([url]) => url as string);

        expect(fetchUrls).toEqual([
            expect.stringContaining("appId=app-1"),
            expect.stringContaining("appId=app-1"),
            expect.stringContaining("user/login"),
            expect.stringContaining("auth.slid"),
            "https://example.test/first",
            expect.stringContaining("appId=app-2"),
            expect.stringContaining("appId=app-2"),
            expect.stringContaining("user/login"),
            expect.stringContaining("auth.slid"),
            "https://example.test/second",
        ]);
    });
});
