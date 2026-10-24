import { describe, expect, it } from "vitest";
import { ApiError, TaskitClient } from "./api";
import {
  exchangeAuthorizationCode,
  providerIdFor,
  refreshAccessToken,
  registerPublicClient,
  sessionRejected,
  TokenEndpointError,
} from "./taskit-oauth";
import {
  createTask,
  listTasks,
  resolveList,
  taskUrl,
  updateTask,
} from "./tasks";
import type { TaskitApi } from "./api";

class FakeApi implements TaskitApi {
  calls: { method: string; path: string; body?: unknown }[] = [];

  constructor(
    private readonly handler: (
      method: string,
      path: string,
      body?: unknown,
    ) => unknown,
  ) {}

  request<T>(method: string, path: string, body?: unknown): Promise<T> {
    this.calls.push({ method, path, body });
    return Promise.resolve(this.handler(method, path, body) as T);
  }
}

describe("TaskitClient", () => {
  it("unwraps the API envelope and refreshes once after a 401", async () => {
    const seen: string[] = [];
    let refreshed = false;
    const fetchImpl: typeof fetch = async (_url, init) => {
      const token = String(
        (init?.headers as Record<string, string>).Authorization,
      );
      seen.push(token);
      if (!refreshed) {
        return new Response(
          JSON.stringify({ error: "expired", code: "UNAUTHORIZED" }),
          { status: 401 },
        );
      }
      return new Response(JSON.stringify({ data: { id: "user-1" } }), {
        status: 200,
      });
    };
    const client = new TaskitClient({
      baseUrl: "http://localhost:7071",
      getToken: () => (refreshed ? "fresh" : "stale"),
      fetchImpl,
      refresh: async () => {
        refreshed = true;
      },
    });

    await expect(client.request("GET", "/api/me")).resolves.toEqual({
      id: "user-1",
    });
    expect(seen).toEqual(["Bearer stale", "Bearer fresh"]);
  });

  it("throws the envelope error without refreshing on other failures", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({ error: "missing", code: "VALIDATION_ERROR" }),
        { status: 400 },
      );
    const client = new TaskitClient({
      baseUrl: "https://api.example",
      getToken: () => "token",
      fetchImpl,
      refresh: async () => {
        throw new Error("should not refresh");
      },
    });

    await expect(client.request("GET", "/api/tasks")).rejects.toMatchObject({
      message: "missing",
      status: 400,
      code: "VALIDATION_ERROR",
    });
  });
});

describe("Taskit OAuth", () => {
  it("registers a public client, then exchanges and refreshes with PKCE", async () => {
    const calls: { url: string; body: string; contentType: string }[] = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      calls.push({
        url: String(url),
        body: String(init?.body),
        contentType: String(
          (init?.headers as Record<string, string>)["Content-Type"],
        ),
      });
      if (String(url).endsWith("/register")) {
        return new Response(JSON.stringify({ client_id: "client-1" }), {
          status: 201,
        });
      }
      return new Response(
        JSON.stringify({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600,
          token_type: "Bearer",
        }),
        { status: 200 },
      );
    };

    const client = await registerPublicClient(
      "https://taskit.example/",
      "https://raycast.com/redirect?packageName=taskit",
      fetchImpl,
    );
    await exchangeAuthorizationCode({
      issuer: "https://taskit.example",
      clientId: client.client_id,
      code: "code-1",
      codeVerifier: "verifier-1",
      redirectUri: "https://raycast.com/redirect?packageName=taskit",
      fetchImpl,
    });
    await refreshAccessToken({
      issuer: "https://taskit.example",
      clientId: client.client_id,
      refreshToken: "refresh-1",
      fetchImpl,
    });

    expect(calls[0].url).toBe("https://taskit.example/register");
    expect(JSON.parse(calls[0].body)).toMatchObject({
      redirect_uris: ["https://raycast.com/redirect?packageName=taskit"],
      token_endpoint_auth_method: "none",
    });
    expect(calls[1].url).toBe("https://taskit.example/token");
    expect(calls[1].contentType).toBe("application/x-www-form-urlencoded");
    expect(new URLSearchParams(calls[1].body).get("grant_type")).toBe(
      "authorization_code",
    );
    expect(new URLSearchParams(calls[1].body).get("code_verifier")).toBe(
      "verifier-1",
    );
    expect(new URLSearchParams(calls[2].body).get("grant_type")).toBe(
      "refresh_token",
    );
  });

  it("keeps a session after a server error and drops it when the server rejects it", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ error: "server_error" }), { status: 503 });
    await expect(
      refreshAccessToken({
        issuer: "https://taskit.example",
        clientId: "client-1",
        refreshToken: "refresh-1",
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(TokenEndpointError);
    try {
      await refreshAccessToken({
        issuer: "https://taskit.example",
        clientId: "client-1",
        refreshToken: "refresh-1",
        fetchImpl,
      });
    } catch (error) {
      expect(sessionRejected(error)).toBe(false);
    }

    const rejected: typeof fetch = async () =>
      new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
    try {
      await refreshAccessToken({
        issuer: "https://taskit.example",
        clientId: "client-1",
        refreshToken: "refresh-1",
        fetchImpl: rejected,
      });
    } catch (error) {
      expect(sessionRejected(error)).toBe(true);
    }
    expect(sessionRejected(new Error("offline"))).toBe(false);
  });
});

describe("sign-in servers", () => {
  it("keeps a separate Raycast token store for each API server", () => {
    const hosted = providerIdFor(
      "https://func-taskit-dev-872f21.azurewebsites.net",
    );
    const local = providerIdFor("http://localhost:7071");
    expect(hosted).not.toBe(local);
    expect(hosted).not.toBe("taskit");
    expect(local.startsWith("taskit:")).toBe(true);
  });
});

describe("tasks", () => {
  it("creates a task with natural language and a resolved list", async () => {
    const api = new FakeApi((method, path, body) => {
      if (method === "GET" && path === "/api/lists")
        return [{ id: "list-1", name: "Personal" }];
      if (method === "POST" && path === "/api/tasks")
        return { id: "task-1", ...(body as object) };
      throw new Error(`${method} ${path}`);
    });

    const created = await createTask(api, {
      text: "Buy milk tomorrow !!",
      list: "Personal",
    });

    expect(api.calls[1].body).toEqual({
      title: "Buy milk tomorrow !!",
      parseNaturalLanguage: true,
      listId: "list-1",
    });
    expect(created.id).toBe("task-1");
  });

  it("reads a list by id and links a task to the web app", async () => {
    const api = new FakeApi((method, path) => {
      if (path === "/api/lists") return [{ id: "list-9", name: "Work" }];
      if (method === "GET" && path.startsWith("/api/tasks")) return [];
      throw new Error(path);
    });

    await listTasks(api, { list: "list-9" });
    expect(api.calls.at(-1)?.path).toBe("/api/tasks?listId=list-9");
    expect(taskUrl("task-1", "overdue")).toBe(
      "https://kind-hill-09b2c840f.3.azurestaticapps.net/upcoming#task-1",
    );
    expect(resolveList([{ id: "inbox", name: "Inbox" }], "inbox").id).toBe(
      "inbox",
    );
  });

  it("patches only the fields that were set", async () => {
    const api = new FakeApi((method, path, body) => {
      if (path === "/api/lists") return [{ id: "list-1", name: "Work" }];
      if (method === "PATCH") return { id: "task-1", ...(body as object) };
      throw new Error(path);
    });

    await expect(updateTask(api, { id: "task-1" })).rejects.toBeInstanceOf(
      ApiError,
    );
    const updated = await updateTask(api, {
      id: "task-1",
      list: "Work",
      dueAt: null,
      priority: "high",
    });
    expect(updated).toMatchObject({
      listId: "list-1",
      dueAt: null,
      priority: "high",
    });
  });
});
