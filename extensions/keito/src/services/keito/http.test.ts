import { describe, expect, it } from "vitest";
import { validateCredentials } from "./config";
import { KeitoError } from "./errors";
import { KeitoHttpClient } from "./http";
import { makeApi, mockFetch, page, TEST_ACCOUNT, TEST_TOKEN } from "./testUtils";

function client(
  routes: Parameters<typeof mockFetch>[0],
  options: { maxPages?: number; maxRetryWaitSeconds?: number } = {},
) {
  const { fetch, calls } = mockFetch(routes);
  const sleeps: number[] = [];
  const rateLimited: number[] = [];
  const http = new KeitoHttpClient({
    token: TEST_TOKEN,
    accountId: TEST_ACCOUNT,
    fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    onRateLimited: (s) => rateLimited.push(s),
    ...options,
  });
  return { http, calls, sleeps, rateLimited };
}

async function rejection(promise: Promise<unknown>): Promise<KeitoError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(KeitoError);
    return error as KeitoError;
  }
  throw new Error("expected the promise to reject");
}

describe("validateCredentials (onboarding)", () => {
  it("requires both values", () => {
    expect(() => validateCredentials({ token: "", accountID: "x" })).toThrowError(/Settings → API & Developers/);
    expect(() => validateCredentials({ token: "kto_a", accountID: " " })).toThrow(
      expect.objectContaining({ kind: "missing_credentials" }),
    );
  });

  it("rejects non-Keito keys, swapped fields, and whitespace without echoing the secret", () => {
    for (const input of [
      { token: "pat_harvest_token", accountID: "123" },
      { token: "123", accountID: "kto_FAKE_secret_in_wrong_field" },
      { token: "kto_abc def", accountID: "cm1" },
      { token: "kto_abc", accountID: "cm 1" },
    ]) {
      try {
        validateCredentials(input);
        throw new Error("should fail");
      } catch (error) {
        expect((error as KeitoError).kind).toBe("malformed_credentials");
        expect((error as Error).message).not.toContain(input.token);
        expect((error as Error).message).not.toContain(input.accountID);
      }
    }
  });

  it("trims pasted values", () => {
    expect(validateCredentials({ token: "  kto_abc\n", accountID: " cm1 " })).toEqual({
      token: "kto_abc",
      accountId: "cm1",
    });
  });
});

describe("KeitoHttpClient requests", () => {
  it("sends the documented auth headers to the v2 base URL, and JSON content type only with a body", async () => {
    const { http, calls } = client({
      "GET /api/v2/users/me": { body: {} },
      "PATCH /api/v2/time_entries/e1/stop": { body: {} },
      "POST /api/v2/time_entries": { body: {} },
    });
    await http.request("GET", "/users/me");
    await http.request("PATCH", "/time_entries/e1/stop");
    await http.request("POST", "/time_entries", { body: { a: 1 } });
    expect(calls[0].url.toString()).toBe("https://app.keito.ai/api/v2/users/me");
    expect(calls[0].headers.Authorization).toBe(`Bearer ${TEST_TOKEN}`);
    expect(calls[0].headers["Keito-Account-Id"]).toBe(TEST_ACCOUNT);
    expect(calls[0].headers["Content-Type"]).toBeUndefined();
    expect(calls[1].body).toBeUndefined();
    expect(calls[2].headers["Content-Type"]).toBe("application/json");
    // Credentials never travel in the URL.
    for (const call of calls) expect(call.url.toString()).not.toContain(TEST_TOKEN);
  });

  it("parses X-Keito-Features", async () => {
    const { http } = client({
      "GET /api/v2/users/me": {
        body: {},
        headers: { "X-Keito-Features": "timer-stop, timer-restart,time-approvals-v1" },
      },
    });
    expect((await http.request("GET", "/users/me")).features).toEqual([
      "timer-stop",
      "timer-restart",
      "time-approvals-v1",
    ]);
  });

  it("returns undefined data for 204 and rejects non-JSON success bodies", async () => {
    const { http } = client({
      "DELETE /api/v2/time_entries/e1": { status: 204 },
      "GET /api/v2/users/me": { rawBody: "<html>proxy</html>" },
    });
    expect((await http.request("DELETE", "/time_entries/e1")).data).toBeUndefined();
    expect((await rejection(http.request("GET", "/users/me"))).kind).toBe("unexpected_response");
  });

  it.each([
    [401, { error: "invalid_token" }, "invalid_credentials"],
    [400, { error: "bad request", error_description: "Missing Keito-Account-Id header" }, "invalid_credentials"],
    [403, { error: "forbidden", error_description: "Project not assigned" }, "forbidden"],
    [404, {}, "not_found"],
    [409, { error: "running_timer_conflict", running_entry: { id: "cmrun" } }, "running_timer_conflict"],
    [409, { error: "conflict", error_description: "Approved time entries cannot be deleted" }, "locked"],
    [422, { error: "unprocessable", error_description: "Task is not assigned to this project" }, "validation"],
  ])("classifies HTTP %i", async (status, body, kind) => {
    const { http } = client({ "POST /api/v2/time_entries": { status, body } });
    const error = await rejection(http.request("POST", "/time_entries", { body: {} }));
    expect(error.kind).toBe(kind);
    expect(error.message).not.toContain(TEST_TOKEN);
    if (kind === "running_timer_conflict") expect(error.runningEntryId).toBe("cmrun");
  });
});

describe("KeitoHttpClient retries", () => {
  it("waits for Retry-After on 429 and then succeeds", async () => {
    const { http, sleeps, rateLimited } = client({
      "GET /api/v2/projects": [
        { status: 429, headers: { "Retry-After": "2" }, body: { error: "rate_limited" } },
        { body: { ok: 1 } },
      ],
    });
    expect((await http.request("GET", "/projects")).data).toEqual({ ok: 1 });
    expect(sleeps).toEqual([2000]);
    expect(rateLimited).toEqual([2]);
  });

  it("does not wait for a Retry-After longer than the limit", async () => {
    const { http, sleeps } = client({ "GET /api/v2/projects": { status: 429, headers: { "Retry-After": "600" } } });
    const error = await rejection(http.request("GET", "/projects"));
    expect(error.kind).toBe("rate_limited");
    expect(error.retryAfterSeconds).toBe(600);
    expect(sleeps).toEqual([]);
  });

  it("stops after the bounded number of 429 retries", async () => {
    const { http, calls } = client({ "POST /api/v2/time_entries": { status: 429, headers: { "Retry-After": "1" } } });
    expect((await rejection(http.request("POST", "/time_entries", { body: {} }))).kind).toBe("rate_limited");
    expect(calls).toHaveLength(3);
  });

  it("retries 5xx and network failures for GET with backoff, never for writes", async () => {
    const get = client({
      "GET /api/v2/projects": [{ status: 502 }, new TypeError("socket hang up"), { body: { ok: 1 } }],
    });
    expect((await get.http.request("GET", "/projects")).data).toEqual({ ok: 1 });
    expect(get.sleeps).toEqual([1000, 2000]);

    const post = client({ "POST /api/v2/time_entries": { status: 503 } });
    expect((await rejection(post.http.request("POST", "/time_entries", { body: {} }))).kind).toBe("server");
    expect(post.calls).toHaveLength(1);

    const offline = client({ "PATCH /api/v2/time_entries/e1/stop": new TypeError("fetch failed") });
    expect((await rejection(offline.http.request("PATCH", "/time_entries/e1/stop"))).kind).toBe("network");
    expect(offline.calls).toHaveLength(1);
  });
});

describe("KeitoHttpClient pagination", () => {
  it("follows relative links.next until null", async () => {
    const { http, calls } = client({
      "GET /api/v2/projects": [
        page("projects", [{ id: "a" }], "/api/v2/projects?is_active=true&page=2&per_page=100"),
        page("projects", [{ id: "b" }], "/api/v2/projects?is_active=true&page=3&per_page=100"),
        page("projects", [{ id: "c" }], null),
      ],
    });
    expect(await http.paginate("/projects", "projects", { is_active: true })).toEqual([
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ]);
    expect(calls.map((c) => c.url.searchParams.get("page"))).toEqual([null, "2", "3"]);
    expect(calls[0].url.searchParams.get("per_page")).toBe("100");
    expect(calls.every((c) => c.headers.Authorization === `Bearer ${TEST_TOKEN}`)).toBe(true);
  });

  it("follows absolute links on the API origin", async () => {
    const { http, calls } = client({
      "GET /api/v2/tasks": [
        page("tasks", [{ id: "t1" }], "https://app.keito.ai/api/v2/tasks?project_id=p&page=2"),
        page("tasks", [{ id: "t2" }]),
      ],
    });
    expect(await http.paginate("/tasks", "tasks", { project_id: "p" })).toHaveLength(2);
    expect(calls[1].url.searchParams.get("project_id")).toBe("p");
  });

  it.each([
    "https://evil.example.com/api/v2/projects?page=2",
    "//evil.example.com/api/v2/projects?page=2",
    "http://app.keito.ai/api/v2/projects?page=2",
    "/api/v3/projects?page=2",
    "/oauth/token",
  ])("refuses to send credentials to %s", async (next) => {
    const { http, calls } = client({ "GET /api/v2/projects": page("projects", [{ id: "a" }], next) });
    expect((await rejection(http.paginate("/projects", "projects"))).kind).toBe("unexpected_response");
    expect(calls).toHaveLength(1);
  });

  it("stops on repeating links and at the page limit", async () => {
    const loop = client({ "GET /api/v2/projects": page("projects", [{ id: "a" }], "/api/v2/projects?per_page=100") });
    expect((await rejection(loop.http.paginate("/projects", "projects"))).message).toMatch(/repeating/);

    let n = 0;
    const endless = client(
      { "GET /api/v2/projects": () => page("projects", [{ id: n }], `/api/v2/projects?page=${++n + 1}`) },
      { maxPages: 3 },
    );
    expect((await rejection(endless.http.paginate("/projects", "projects"))).message).toMatch(/Stopped after 3 pages/);
    expect(endless.calls).toHaveLength(3);
  });

  it("falls back to page numbers when an envelope has no links", async () => {
    const { http, calls } = client({
      "GET /api/v2/projects": [
        { body: { projects: [{ id: "a" }], page: 1, total_pages: 2 } },
        { body: { projects: [{ id: "b" }], page: 2, total_pages: 2 } },
      ],
    });
    expect(await http.paginate("/projects", "projects")).toHaveLength(2);
    expect(calls[1].url.searchParams.get("page")).toBe("2");
  });

  it("rejects envelopes without the collection key", async () => {
    const { http } = client({ "GET /api/v2/projects": { body: { data: [] } } });
    expect((await rejection(http.paginate("/projects", "projects"))).kind).toBe("unexpected_response");
  });
});

describe("KeitoApi endpoint shapes", () => {
  it("lists projects and project-scoped tasks with string IDs across pages", async () => {
    const { api, calls } = makeApi(
      {
        "GET /api/v2/projects": [
          page(
            "projects",
            [{ id: 101, name: "Numeric", client: { id: 9, name: "Acme" } }],
            "/api/v2/projects?page=2&per_page=1",
          ),
          page("projects", [{ id: "cmp2", name: "Second", client_id: "cmc2" }, { name: "no id" }]),
        ],
        "GET /api/v2/tasks": page("tasks", [{ id: "cmt1", name: "Design" }]),
      },
      { perPage: 1 },
    );
    const projects = await api.listProjects();
    expect(projects).toEqual([
      { id: "101", name: "Numeric", code: undefined, clientId: "9", clientName: "Acme" },
      { id: "cmp2", name: "Second", code: undefined, clientId: "cmc2", clientName: undefined },
    ]);
    expect(calls[0].url.searchParams.get("is_active")).toBe("true");

    expect(await api.listProjectTasks("cmp2")).toEqual([{ id: "cmt1", name: "Design" }]);
    expect(calls[2].url.searchParams.get("project_id")).toBe("cmp2");
    expect(calls[2].url.searchParams.get("is_active")).toBe("true");
    expect(await api.listProjectTasks("")).toEqual([]);
    expect(calls).toHaveLength(3);
  });

  it("queries time entries by user and YYYY-MM-DD dates", async () => {
    const { api, calls } = makeApi({ "GET /api/v2/time_entries": page("time_entries", []) });
    await api.listTimeEntries({ userId: "cmu", from: "2026-10-14", to: "2026-10-14" });
    expect(Object.fromEntries(calls[0].url.searchParams)).toMatchObject({
      user_id: "cmu",
      from: "2026-10-14",
      to: "2026-10-14",
    });
  });

  it("uses stop/restart endpoints and URL-encodes IDs", async () => {
    const { api, calls } = makeApi({
      "PATCH /api/v2/time_entries/a%2Fb/stop": {
        body: { id: "a/b", project_id: "p", task_id: "t", is_running: false },
      },
      "PATCH /api/v2/time_entries/e1/restart": { body: { id: "e1", project_id: "p", task_id: "t", is_running: true } },
      "DELETE /api/v2/time_entries/e1": { status: 204 },
    });
    await api.stopTimeEntry("a/b");
    await api.restartTimeEntry("e1", { replaceRunning: true });
    await api.restartTimeEntry("e1");
    await api.deleteTimeEntry("e1");
    expect(calls.map((c) => [c.method, c.url.pathname, c.body])).toEqual([
      ["PATCH", "/api/v2/time_entries/a%2Fb/stop", undefined],
      ["PATCH", "/api/v2/time_entries/e1/restart", { replace_running: true }],
      ["PATCH", "/api/v2/time_entries/e1/restart", undefined],
      ["DELETE", "/api/v2/time_entries/e1", undefined],
    ]);
  });

  it("guards invalid timer bodies before sending", async () => {
    const { api, calls } = makeApi({});
    await expect(
      api.createTimeEntry({ project_id: "p", task_id: "t", spent_date: "2026-10-15", is_running: true, hours: 1 }),
    ).rejects.toMatchObject({ kind: "validation" });
    await expect(
      api.createTimeEntry({ project_id: "p", task_id: "t", spent_date: "2026-10-15", replace_running: true }),
    ).rejects.toMatchObject({ kind: "validation" });
    await expect(api.updateTimeEntry("e1", {})).rejects.toMatchObject({ kind: "validation" });
    expect(calls).toHaveLength(0);
  });
});
