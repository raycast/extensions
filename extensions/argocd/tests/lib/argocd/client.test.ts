import { describe, expect, it, vi } from "vitest";
import { ArgoClient, type ClientDeps } from "../../../src/lib/argocd/client";
import {
  ApiError,
  ForbiddenError,
  NetworkError,
  NotFoundError,
  ReadOnlyInstanceError,
  TimeoutError,
} from "../../../src/lib/argocd/errors";
import { AuthError } from "../../../src/lib/auth/provider";
import type { ArgoInstance } from "../../../src/lib/config/instances";

const SECRET = "the-bearer-value";

function instance(overrides: Partial<ArgoInstance> = {}): ArgoInstance {
  return {
    id: "i1",
    name: "dev",
    baseUrl: "https://argocd.example.com",
    env: "dev",
    authMode: "cli",
    allowWrite: false,
    enabled: true,
    ...overrides,
  };
}

interface Recorded {
  url: URL;
  init: RequestInit;
}

function recorder(response: () => Response) {
  const calls: Recorded[] = [];
  const fetchStub = vi.fn(async (input: string | URL, init?: RequestInit) => {
    calls.push({ url: new URL(String(input)), init: init ?? {} });
    return response();
  });
  return { calls, fetchStub: fetchStub as unknown as typeof globalThis.fetch };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function deps(fetchStub: typeof globalThis.fetch, overrides: Partial<ClientDeps> = {}): ClientDeps {
  return { fetch: fetchStub, getToken: vi.fn().mockResolvedValue(SECRET), ...overrides };
}

const APP_LIST = {
  metadata: { resourceVersion: "9001" },
  items: [
    { metadata: { name: "app-one", namespace: "team-a-apps" }, spec: { project: "team-a" } },
    { metadata: {} },
    { metadata: { name: "app-two" }, spec: { project: "team-b" } },
  ],
};

describe("listApplications", () => {
  it("asks for the plain list and adds no query parameter the API would ignore", async () => {
    const { calls, fetchStub } = recorder(() => json(APP_LIST));
    await new ArgoClient(instance(), deps(fetchStub)).listApplications();

    const url = calls[0]?.url;
    expect(url?.origin).toBe("https://argocd.example.com");
    expect(url?.pathname).toBe("/api/v1/applications");
    // ApplicationQuery has no `fields`: the ArgoCD UI sends one and the server ignores it.
    expect([...(url?.searchParams.keys() ?? [])]).toEqual([]);
  });

  it("authenticates with a bearer token and leaves content negotiation to Node", async () => {
    const { calls, fetchStub } = recorder(() => json(APP_LIST));
    await new ArgoClient(instance(), deps(fetchStub)).listApplications();

    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${SECRET}`);
    expect(headers.Accept).toBe("application/json");
    // Setting Accept-Encoding by hand is how you end up holding a compressed buffer.
    expect(Object.keys(headers).map((key) => key.toLowerCase())).not.toContain("accept-encoding");
  });

  it("returns the projected applications, dropping what it cannot identify", async () => {
    const { fetchStub } = recorder(() => json(APP_LIST));
    const result = await new ArgoClient(instance(), deps(fetchStub)).listApplications();
    expect(result.apps.map((app) => app.name)).toEqual(["app-one", "app-two"]);
  });

  it("survives a response with no items", async () => {
    const { fetchStub } = recorder(() => json({}));
    await expect(new ArgoClient(instance(), deps(fetchStub)).listApplications()).resolves.toEqual({
      apps: [],
    });
  });

  it("never materialises the list: the body is read as a stream, not with json()", async () => {
    const body = JSON.stringify(APP_LIST);
    const response = new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
    const jsonSpy = vi.spyOn(response, "json");
    const fetchStub = vi.fn(async () => response) as unknown as typeof fetch;

    await new ArgoClient(instance(), deps(fetchStub)).listApplications();
    expect(jsonSpy).not.toHaveBeenCalled();
  });
});

describe("listApplicationSets", () => {
  it("projects the ApplicationSet list", async () => {
    const { calls, fetchStub } = recorder(() =>
      json({
        metadata: { resourceVersion: "7" },
        items: [{ metadata: { name: "team-a-set", namespace: "team-a-apps" } }],
      }),
    );
    const result = await new ArgoClient(instance(), deps(fetchStub)).listApplicationSets();

    expect(calls[0]?.url.pathname).toBe("/api/v1/applicationsets");
    expect(result.appSets.map((set) => set.name)).toEqual(["team-a-set"]);
  });
});

describe("getApplication", () => {
  const APP = { metadata: { name: "app-one", namespace: "team-a-apps" }, spec: { project: "team-a" } };

  it("scopes the read to the application namespace with the detail projection", async () => {
    const { calls, fetchStub } = recorder(() => json(APP));
    await new ArgoClient(instance(), deps(fetchStub)).getApplication("app-one", "team-a-apps");

    expect(calls[0]?.url.pathname).toBe("/api/v1/applications/app-one");
    expect(calls[0]?.url.searchParams.get("appNamespace")).toBe("team-a-apps");
    expect(calls[0]?.url.searchParams.get("refresh")).toBeNull();
  });

  it("asks for a refresh only when told to", async () => {
    const { calls, fetchStub } = recorder(() => json(APP));
    const client = new ArgoClient(instance(), deps(fetchStub));
    await client.getApplication("app-one", "team-a-apps", "hard");
    expect(calls[0]?.url.searchParams.get("refresh")).toBe("hard");
  });

  it("polls a single application while a sync runs, scoped to its namespace", async () => {
    const { calls, fetchStub } = recorder(() => json(APP));
    await new ArgoClient(instance(), deps(fetchStub)).getApplicationStatus("app-one", "team-a-apps");
    expect(calls[0]?.url.pathname).toBe("/api/v1/applications/app-one");
    expect(calls[0]?.url.searchParams.get("appNamespace")).toBe("team-a-apps");
  });

  it("escapes an application name that would otherwise change the path", async () => {
    const { calls, fetchStub } = recorder(() => json(APP));
    await new ArgoClient(instance(), deps(fetchStub)).getApplication("weird/name", "team-a-apps");
    expect(calls[0]?.url.pathname).toBe("/api/v1/applications/weird%2Fname");
  });

  it("rejects a response with no identifiable application", async () => {
    const { fetchStub } = recorder(() => json({ metadata: {} }));
    await expect(
      new ArgoClient(instance(), deps(fetchStub)).getApplication("app-one", "team-a-apps"),
    ).rejects.toThrowError(ApiError);
  });
});

describe("error mapping", () => {
  it.each([
    [401, AuthError],
    [403, ForbiddenError],
    [404, NotFoundError],
    [500, ApiError],
    [502, ApiError],
  ])("maps %i to the matching error", async (status, expected) => {
    const { fetchStub } = recorder(() => json({ message: "server said no" }, status));
    await expect(new ArgoClient(instance(), deps(fetchStub)).listApplications()).rejects.toThrowError(
      expected as never,
    );
  });

  it("surfaces the server message on a 500", async () => {
    const { fetchStub } = recorder(() => json({ message: "server said no" }, 500));
    await expect(new ArgoClient(instance(), deps(fetchStub)).listApplications()).rejects.toThrowError(/server said no/);
  });

  it("stays readable when the error body is not JSON", async () => {
    const { fetchStub } = recorder(() => new Response("<html>502</html>", { status: 502 }));
    await expect(new ArgoClient(instance(), deps(fetchStub)).listApplications()).rejects.toThrowError(/answered 502/);
  });

  it("truncates a very long server message", async () => {
    const { fetchStub } = recorder(() => json({ message: "x".repeat(500) }, 500));
    await new ArgoClient(instance(), deps(fetchStub))
      .listApplications()
      .catch((error: Error) => expect(error.message.length).toBeLessThan(300));
    expect.assertions(1);
  });

  it("maps a transport failure to a network error naming the VPN", async () => {
    const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    await expect(new ArgoClient(instance(), deps(fetchStub)).listApplications()).rejects.toThrowError(NetworkError);
    await expect(new ArgoClient(instance(), deps(fetchStub)).listApplications()).rejects.toThrowError(/VPN/);
  });

  it("maps an abort to a timeout", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    const fetchStub = vi.fn().mockRejectedValue(abort) as unknown as typeof fetch;
    await expect(new ArgoClient(instance(), deps(fetchStub)).listApplications()).rejects.toThrowError(TimeoutError);
  });

  it("never puts the token or the request URL in an error message", async () => {
    const { fetchStub } = recorder(() => json({ message: "nope" }, 500));
    await new ArgoClient(instance(), deps(fetchStub)).listApplications().catch((error: Error) => {
      expect(error.message).not.toContain(SECRET);
      expect(error.message).not.toContain("appNamespace=");
    });
    expect.assertions(2);
  });

  it("honours the caller's abort signal", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchStub = vi.fn(async (_input: unknown, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      return json(APP_LIST);
    }) as unknown as typeof fetch;
    await expect(new ArgoClient(instance(), deps(fetchStub)).listApplications(controller.signal)).rejects.toThrowError(
      TimeoutError,
    );
  });
});

describe("sync", () => {
  it("refuses to build a request at all on a read-only instance", async () => {
    const { fetchStub, calls } = recorder(() => json({}));
    await expect(
      new ArgoClient(instance({ allowWrite: false }), deps(fetchStub)).sync("app-one", "team-a-apps", {}),
    ).rejects.toThrowError(ReadOnlyInstanceError);
    expect(calls).toHaveLength(0);
  });

  it("posts the sync body when the instance is writable", async () => {
    const { calls, fetchStub } = recorder(() => json({}));
    await new ArgoClient(instance({ allowWrite: true }), deps(fetchStub)).sync("app-one", "team-a-apps", {
      prune: true,
      dryRun: true,
    });

    const call = calls[0];
    expect(call?.init.method).toBe("POST");
    expect(call?.url.pathname).toBe("/api/v1/applications/app-one/sync");
    expect(call?.url.searchParams.get("appNamespace")).toBe("team-a-apps");
    expect((call?.init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(String(call?.init.body))).toEqual({ prune: true, dryRun: true });
  });

  it("accepts an empty 204 answer", async () => {
    const { fetchStub } = recorder(() => new Response(null, { status: 204 }));
    await expect(
      new ArgoClient(instance({ allowWrite: true }), deps(fetchStub)).sync("app-one", "team-a-apps", {}),
    ).resolves.toBeUndefined();
  });
});

describe("deep links", () => {
  it("builds the web UI URL of an application", () => {
    expect(new ArgoClient(instance(), deps(vi.fn() as unknown as typeof fetch)).appUrl("app-one", "argocd")).toBe(
      "https://argocd.example.com/applications/argocd/app-one",
    );
  });

  it("builds the web UI URL of an ApplicationSet", () => {
    expect(
      new ArgoClient(instance(), deps(vi.fn() as unknown as typeof fetch)).appSetUrl("team-a-set", "team-a-apps"),
    ).toBe("https://argocd.example.com/applicationsets/team-a-apps/team-a-set");
  });
});
