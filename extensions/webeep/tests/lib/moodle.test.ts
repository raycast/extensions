import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage, mockPreferences } from "../__mocks__/@raycast/api";
import { AuthError, storageKeyFor } from "../../src/lib/auth";
import { browserFileUrl, callWs, encodeParams, isWsError, withToken } from "../../src/lib/moodle";

const TOKEN = "0123456789abcdef0123456789abcdef";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers({ "content-type": "application/json" }),
  } as Response;
}

describe("encodeParams", () => {
  it("flattens arrays and nested objects PHP-style", () => {
    const encoded = encodeParams({
      courseids: [1, 2],
      courses: [{ id: 7, favourite: true }],
      classification: "all",
      limit: 0,
    });
    expect(encoded.toString()).toBe(
      "courseids%5B0%5D=1&courseids%5B1%5D=2&courses%5B0%5D%5Bid%5D=7&courses%5B0%5D%5Bfavourite%5D=1&classification=all&limit=0",
    );
  });
});

describe("isWsError", () => {
  it("detects Moodle exception envelopes", () => {
    expect(isWsError({ exception: "x", errorcode: "invalidtoken", message: "m" })).toBe(true);
    expect(isWsError({ courses: [] })).toBe(false);
    expect(isWsError(null)).toBe(false);
  });
});

describe("callWs", () => {
  beforeEach(() => {
    mockPreferences.sessionCookie = TOKEN;
  });

  it("posts form-encoded params with the token in the query string", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ courses: [] }));
    const data = await callWs<{ courses: unknown[] }>(
      "core_course_get_enrolled_courses_by_timeline_classification",
      { classification: "all" },
      fetchMock as unknown as typeof fetch,
    );
    expect(data).toEqual({ courses: [] });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      `https://webeep.polimi.it/webservice/rest/server.php?moodlewsrestformat=json&wstoken=${TOKEN}&wsfunction=core_course_get_enrolled_courses_by_timeline_classification`,
    );
    expect(init.method).toBe("POST");
    expect(init.body).toBe("classification=all");
  });

  it("turns a Moodle error envelope into an Error with the message", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ exception: "moodle_exception", errorcode: "nope", message: "Function missing" }),
    );
    await expect(callWs("x", {}, fetchMock as unknown as typeof fetch)).rejects.toThrow("Function missing");
  });

  it("clears the cached token and raises AuthError on invalidtoken", async () => {
    mockPreferences.sessionCookie = "cookie-value";
    await LocalStorage.setItem(storageKeyFor("cookie-value"), TOKEN);
    const fetchMock = vi.fn(async () =>
      jsonResponse({ exception: "moodle_exception", errorcode: "invalidtoken", message: "Invalid token" }),
    );
    await expect(callWs("x", {}, fetchMock as unknown as typeof fetch)).rejects.toBeInstanceOf(AuthError);
    expect(await LocalStorage.getItem(storageKeyFor("cookie-value"))).toBeUndefined();
  });

  it("fails on non-2xx responses", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, 503));
    await expect(callWs("x", {}, fetchMock as unknown as typeof fetch)).rejects.toThrow("HTTP 503");
  });
});

describe("file URLs", () => {
  const wsUrl = "https://webeep.polimi.it/webservice/pluginfile.php/1/mod_folder/content/1/A%20B.pdf?forcedownload=1";

  it("withToken appends the token", () => {
    expect(withToken(wsUrl, TOKEN)).toBe(`${wsUrl}&token=${TOKEN}`);
  });

  it("browserFileUrl removes the webservice prefix, forcedownload and token", () => {
    expect(browserFileUrl(`${wsUrl}&token=${TOKEN}`)).toBe(
      "https://webeep.polimi.it/pluginfile.php/1/mod_folder/content/1/A%20B.pdf",
    );
  });
});
