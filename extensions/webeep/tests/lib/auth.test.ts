import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage, mockPreferences } from "../__mocks__/@raycast/api";
import {
  AuthError,
  clearStoredToken,
  exchangeCookieForToken,
  getToken,
  extractSessionCookie,
  looksLikeToken,
  parseLaunchLocation,
  storageKeyFor,
} from "../../src/lib/auth";

const TOKEN = "0123456789abcdef0123456789abcdef";
const PRIVATE = "PRIVATETOKENPRIVATETOKENPRIVATETOKENPRIVATETOKENPRIVATETOKEN0000";

function launchLocation(token = TOKEN): string {
  const payload = Buffer.from(`12345:::${token}:::${PRIVATE}`).toString("base64");
  return `moodlemobile://token=${payload}`;
}

function redirectResponse(location: string | null): Response {
  const headers = new Headers();
  if (location) headers.set("location", location);
  return { status: 302, headers } as Response;
}

describe("looksLikeToken", () => {
  it("accepts a 32-char hex token and rejects cookies", () => {
    expect(looksLikeToken(TOKEN)).toBe(true);
    expect(looksLikeToken(` ${TOKEN.toUpperCase()} `)).toBe(true);
    expect(looksLikeToken("not-a-token-just-a-cookie")).toBe(false);
  });
});

describe("extractSessionCookie", () => {
  it("accepts the bare value, the name=value form and a whole cookie header", () => {
    expect(extractSessionCookie("  not-a-token-just-a-cookie ")).toBe("not-a-token-just-a-cookie");
    expect(extractSessionCookie("MoodleSession=not-a-token-just-a-cookie")).toBe("not-a-token-just-a-cookie");
    expect(extractSessionCookie("acb_consent=1; MoodleSession=not-a-token-just-a-cookie; other=x")).toBe(
      "not-a-token-just-a-cookie",
    );
    expect(extractSessionCookie("")).toBe("");
  });
});

describe("parseLaunchLocation", () => {
  it("extracts the token from the moodlemobile redirect", () => {
    expect(parseLaunchLocation(launchLocation())).toBe(TOKEN);
  });

  it("throws an AuthError for other locations", () => {
    expect(() => parseLaunchLocation("https://webeep.polimi.it/login/index.php")).toThrow(AuthError);
    expect(() => parseLaunchLocation(`moodlemobile://token=${Buffer.from("garbage").toString("base64")}`)).toThrow(
      AuthError,
    );
  });
});

describe("exchangeCookieForToken", () => {
  it("sends the cookie and does not follow the redirect", async () => {
    const fetchMock = vi.fn(async () => redirectResponse(launchLocation()));
    const token = await exchangeCookieForToken("cookie-value", fetchMock as unknown as typeof fetch);
    expect(token).toBe(TOKEN);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/admin/tool/mobile/launch.php?service=moodle_mobile_app");
    expect(init.redirect).toBe("manual");
    expect((init.headers as Record<string, string>).Cookie).toBe("MoodleSession=cookie-value");
  });

  it("throws an AuthError when Moodle redirects to the login page", async () => {
    const fetchMock = vi.fn(async () => redirectResponse("https://webeep.polimi.it/login/index.php"));
    await expect(exchangeCookieForToken("expired", fetchMock as unknown as typeof fetch)).rejects.toBeInstanceOf(
      AuthError,
    );
  });
});

describe("getToken", () => {
  beforeEach(async () => {
    await LocalStorage.clear();
    mockPreferences.sessionCookie = "cookie-value";
    vi.unstubAllGlobals();
  });

  it("uses the preference directly when it already is a token", async () => {
    mockPreferences.sessionCookie = TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await getToken()).toBe(TOKEN);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("strips a leading MoodleSession= prefix", async () => {
    mockPreferences.sessionCookie = `MoodleSession=${TOKEN}`;
    expect(await getToken()).toBe(TOKEN);
  });

  it("exchanges the cookie once and caches the token", async () => {
    const fetchMock = vi.fn(async () => redirectResponse(launchLocation()));
    vi.stubGlobal("fetch", fetchMock);
    expect(await getToken()).toBe(TOKEN);
    expect(await getToken()).toBe(TOKEN);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await LocalStorage.getItem(storageKeyFor("cookie-value"))).toBe(TOKEN);
  });

  it("re-exchanges after the stored token is cleared", async () => {
    const fetchMock = vi.fn(async () => redirectResponse(launchLocation()));
    vi.stubGlobal("fetch", fetchMock);
    await getToken();
    await clearStoredToken();
    await getToken();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws an AuthError when no cookie is configured", async () => {
    mockPreferences.sessionCookie = "   ";
    await expect(getToken()).rejects.toBeInstanceOf(AuthError);
  });
});
