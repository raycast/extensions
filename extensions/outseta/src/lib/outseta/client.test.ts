import { afterEach, describe, expect, it, vi } from "vitest";
import accountsList from "../../../fixtures/accounts-list.json";
import { AuthError, canReply, CaseFilter, createClient, RateLimitError, ReplyError, retryAfterMs } from "./client";
import { CaseStatus } from "./types";

const credentials = { subdomain: "acme", apiKey: "key", secretKey: "secret" };

function stubFetch(...responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  const queue = [...responses];
  return vi.fn<typeof fetch>(async () => {
    const next = queue.shift() ?? { status: 200, body: {} };
    const text = next.body === undefined ? "" : JSON.stringify(next.body);
    return new Response(text, { status: next.status, headers: next.headers });
  });
}

function requestedUrl(fetchMock: ReturnType<typeof stubFetch>, call = 0) {
  return new URL(String(fetchMock.mock.calls[call]?.[0]));
}

describe("createClient", () => {
  it("sends the Outseta auth header to the account's subdomain", async () => {
    const fetchMock = stubFetch({ status: 200, body: accountsList });
    await createClient(credentials, { fetch: fetchMock }).searchAccounts({ query: "acme" });

    const url = requestedUrl(fetchMock);
    expect(url.origin + url.pathname).toBe("https://acme.outseta.com/api/v1/crm/accounts");
    expect(url.searchParams.get("q")).toBe("acme");
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Outseta key:secret");
  });

  it("treats offset as a page index when working out hasMore", async () => {
    const fetchMock = stubFetch({ status: 200, body: accountsList });
    const page = await createClient(credentials, { fetch: fetchMock }).searchAccounts({});

    expect(requestedUrl(fetchMock).searchParams.get("offset")).toBe("0");
    expect(page.items).toHaveLength(3);
    expect(page.total).toBe(5);
    expect(page.hasMore).toBe(true);
  });

  it("reports no more pages on the last page", async () => {
    const fetchMock = stubFetch({
      status: 200,
      body: { metadata: { limit: 3, offset: 1, total: 5 }, items: [{}, {}] },
    });
    const page = await createClient(credentials, { fetch: fetchMock }).searchAccounts({ page: 1 });
    expect(page.hasMore).toBe(false);
  });

  it("throws AuthError on 401", async () => {
    const client = createClient(credentials, { fetch: stubFetch({ status: 401 }) });
    await expect(client.getPerson("p1")).rejects.toBeInstanceOf(AuthError);
  });

  it("retries a 429 once, then succeeds", async () => {
    const fetchMock = stubFetch({ status: 429 }, { status: 200, body: { Uid: "p1" } });
    const person = await createClient(credentials, { fetch: fetchMock, retryDelayMs: 0 }).getPerson("p1");
    expect(person.Uid).toBe("p1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("with fake timers", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("waits as long as Retry-After asks before retrying a 429", async () => {
      vi.useFakeTimers();
      const fetchMock = stubFetch(
        { status: 429, headers: { "Retry-After": "10" } },
        { status: 200, body: { Uid: "p1" } },
      );
      const person = createClient(credentials, { fetch: fetchMock, retryDelayMs: 0 }).getPerson("p1");

      await vi.advanceTimersByTimeAsync(9_999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect((await person).Uid).toBe("p1");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("sends at most 7 requests per 5 seconds", async () => {
      vi.useFakeTimers();
      const fetchMock = stubFetch();
      const client = createClient(credentials, { fetch: fetchMock });
      const people = Array.from({ length: 8 }, (_, i) => client.getPerson(`p${i}`));

      await vi.advanceTimersByTimeAsync(4_999);
      expect(fetchMock).toHaveBeenCalledTimes(7);
      await vi.advanceTimersByTimeAsync(1);
      await Promise.all(people);
      expect(fetchMock).toHaveBeenCalledTimes(8);
    });

    it("holds every request while Outseta asks to wait after a 429", async () => {
      vi.useFakeTimers();
      const fetchMock = stubFetch({ status: 429, headers: { "Retry-After": "10" } });
      const client = createClient(credentials, { fetch: fetchMock });
      const first = client.getPerson("p1");
      await vi.advanceTimersByTimeAsync(0);
      const second = client.getPerson("p2");

      await vi.advanceTimersByTimeAsync(9_999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      await Promise.all([first, second]);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("doesn't pace requests when rateLimit is null", async () => {
      vi.useFakeTimers();
      const fetchMock = stubFetch();
      const client = createClient(credentials, { fetch: fetchMock, rateLimit: null });
      await Promise.all(Array.from({ length: 8 }, (_, i) => client.getPerson(`p${i}`)));
      expect(fetchMock).toHaveBeenCalledTimes(8);
    });
  });

  it("gives up after a second 429", async () => {
    const client = createClient(credentials, {
      fetch: stubFetch({ status: 429 }, { status: 429 }),
      retryDelayMs: 0,
    });
    await expect(client.getPerson("p1")).rejects.toBeInstanceOf(RateLimitError);
  });

  it("throws OutsetaError with the status for other failures", async () => {
    const client = createClient(credentials, { fetch: stubFetch({ status: 500 }) });
    await expect(client.getCase("c1")).rejects.toMatchObject({ status: 500 });
  });
});

describe("searchCases", () => {
  async function caseParams(filter?: CaseFilter) {
    const fetchMock = stubFetch({ status: 200, body: { items: [] } });
    await createClient(credentials, { fetch: fetchMock }).searchCases({ filter });
    const params = Object.fromEntries(requestedUrl(fetchMock).searchParams);
    delete params.limit;
    delete params.offset;
    delete params.fields;
    delete params.orderBy;
    return params;
  }

  it("sends no case filter params when no filter is given", async () => {
    expect(await caseParams()).toEqual({});
    expect(await caseParams({})).toEqual({});
  });

  it("filters by status", async () => {
    expect(await caseParams({ status: CaseStatus.Closed })).toEqual({ Status: "2" });
  });

  it("filters open cases assigned to nobody", async () => {
    expect(await caseParams({ status: CaseStatus.Open, assignee: "unassigned" })).toEqual({
      Status: "1",
      AssignedToPersonClientIdentifier__isnull: "true",
    });
  });

  it("filters cases assigned to an agent", async () => {
    expect(await caseParams({ assignee: { uid: "agent-1" } })).toEqual({ AssignedToPersonClientIdentifier: "agent-1" });
  });

  it("lists most recent activity first", async () => {
    const fetchMock = stubFetch({ status: 200, body: { items: [] } });
    await createClient(credentials, { fetch: fetchMock }).searchCases({});
    expect(requestedUrl(fetchMock).searchParams.get("orderBy")).toBe("LastActivity DESC");
  });
});

describe("replyToCase", () => {
  const openCase = { Uid: "c1", Status: CaseStatus.Open };

  it("posts the text as HTML with the agent name and accepts an empty response body", async () => {
    const fetchMock = stubFetch({ status: 200 });
    await createClient(credentials, { fetch: fetchMock, agentName: " Jane " }).replyToCase(
      openCase,
      "Hi <there>\n\nThanks",
    );

    expect(requestedUrl(fetchMock).pathname).toBe("/api/v1/support/cases/c1/replies");
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      Comment: "<p>Hi &lt;there&gt;</p><p>Thanks</p>",
      AgentName: "Jane",
    });
  });

  it.each([
    ["an empty", "  "],
    ["a missing", undefined],
  ])("leaves out AgentName with %s agent name so Outseta signs with the company name", async (_, agentName) => {
    const fetchMock = stubFetch({ status: 200 });
    await createClient(credentials, { fetch: fetchMock, agentName }).replyToCase(openCase, "Hi");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ Comment: "<p>Hi</p>" });
  });

  it.each([
    ["a spam case", { Uid: "c1", Status: CaseStatus.Spam }, "Hi", /spam/],
    ["empty text", openCase, "  \n ", /Write a reply/],
  ])("refuses %s without calling the API", async (_, supportCase, text, message) => {
    const fetchMock = stubFetch();
    const reply = createClient(credentials, { fetch: fetchMock, agentName: "Jane" }).replyToCase(supportCase, text);
    await expect(reply).rejects.toBeInstanceOf(ReplyError);
    await expect(reply).rejects.toThrow(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets the write guard block the request", async () => {
    const fetchMock = stubFetch();
    const client = createClient(credentials, {
      fetch: fetchMock,
      agentName: "Jane",
      guardWrite: () => {
        throw new Error("blocked");
      },
    });
    await expect(client.replyToCase(openCase, "Hi")).rejects.toThrow("blocked");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("retryAfterMs", () => {
  it("reads seconds and HTTP dates, and ignores anything else", () => {
    const now = Date.parse("2026-10-27T12:00:00Z");
    expect(retryAfterMs("10", now)).toBe(10_000);
    expect(retryAfterMs("Tue, 27 Oct 2026 12:00:05 GMT", now)).toBe(5_000);
    expect(retryAfterMs("Tue, 27 Oct 2026 11:00:00 GMT", now)).toBe(0);
    expect(retryAfterMs("soon", now)).toBeUndefined();
    expect(retryAfterMs(null, now)).toBeUndefined();
  });
});

describe("canReply", () => {
  it("allows replies to every case except spam", () => {
    expect(canReply({ Status: CaseStatus.Open })).toBe(true);
    expect(canReply({ Status: CaseStatus.Closed })).toBe(true);
    expect(canReply({ Status: CaseStatus.Spam })).toBe(false);
  });
});
