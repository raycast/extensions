import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPreferenceValues: vi.fn(),
  openExtensionPreferences: vi.fn(async () => undefined),
}));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: mocks.getPreferenceValues,
  openExtensionPreferences: mocks.openExtensionPreferences,
}));

import { ValidationError } from "../domain/errors";
import type { AuthProvider } from "../infrastructure/auth/AuthProvider";
import type { BackendCapabilities, TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { InMemoryCachePort } from "../test/fakes/InMemoryCachePort";
import { createTickTickCommandBootstrap, loadTickTickAiToolRuntime, resolveUiTimeZone } from "./commandBootstrap";

const REMOTE_CAPABILITIES: BackendCapabilities = {
  create: true,
  update: true,
  complete: true,
  reopen: true,
  move: true,
  completedQuery: true,
  inboxQuery: true,
  exactTaskLink: false,
};

function fakeBackend(id: TickTickBackend["id"], identity?: string): TickTickBackend {
  return {
    id,
    capabilities: () => ({ ...REMOTE_CAPABILITIES }),
    accountIdentity: async () => identity,
    listProjects: async () => [],
    queryTasks: async () => ({ tasks: [], failedProjectIds: [] }),
    createTask: async () => {
      throw new Error("unused");
    },
    updateTask: async () => {
      throw new Error("unused");
    },
    completeTask: async () => undefined,
    reopenTask: async () => undefined,
    moveTask: async () => {
      throw new Error("unused");
    },
  };
}

function preferences(overrides: Partial<Preferences> = {}): () => Preferences {
  return () => ({ defaultTitle: "none", ...overrides } as Preferences);
}

describe("createTickTickCommandBootstrap", () => {
  it("composes the API-token MCP runtime with a token-fingerprint account key", async () => {
    const bootstrap = createTickTickCommandBootstrap({
      readPreferences: preferences({ authMode: "apiToken", apiToken: "synthetic-token" }),
      cachePort: new InMemoryCachePort(),
    });

    const input = await bootstrap();
    expect(input.backend.id).toBe("mcp");
    expect(input.accountKey).toMatch(/^token:mcp:[0-9a-f]{64}$/);
    expect(input.accountKey).not.toContain("synthetic-token");
    expect(input.onReconnect).toBeTypeOf("function");
    expect(input.onOpenPreferences).toBeTypeOf("function");
  });

  it("treats retired auth-mode values as OAuth instead of failing", async () => {
    const createAuthProvider = vi.fn(() => ({
      target: "mcp" as const,
      getAccessToken: async () => "access-token",
      invalidate: async () => undefined,
      accountCacheKey: async () => "oauth:11111111-2222-4333-8444-555555555555",
    }));
    const bootstrap = createTickTickCommandBootstrap({
      readPreferences: preferences({ authMode: "legacy" as unknown as Preferences["authMode"] }),
      cachePort: new InMemoryCachePort(),
      createAuthProvider,
      createRemoteBackend: () => fakeBackend("mcp"),
    });

    const input = await bootstrap();
    expect(input.backend.id).toBe("mcp");
    expect(createAuthProvider).toHaveBeenCalledWith("oauth", expect.anything());
  });

  it("memoizes one successful composition and retries after failure", async () => {
    const readPreferences = vi
      .fn<() => Preferences>()
      .mockImplementationOnce(() => {
        throw new ValidationError("first attempt fails");
      })
      .mockImplementation(preferences({ authMode: "apiToken", apiToken: "synthetic-token" }));
    const bootstrap = createTickTickCommandBootstrap({
      readPreferences,
      cachePort: new InMemoryCachePort(),
    });

    await expect(bootstrap()).rejects.toBeInstanceOf(ValidationError);
    const first = await bootstrap();
    const attemptsAfterSuccess = readPreferences.mock.calls.length;
    const second = await bootstrap();
    expect(second).toBe(first);
    expect(readPreferences.mock.calls.length).toBe(attemptsAfterSuccess);
  });

  it("derives the OAuth account key and reconnect flow from the auth provider", async () => {
    const invalidate = vi.fn(async () => undefined);
    const getAccessToken = vi.fn(async () => "access-token");
    const auth: AuthProvider = {
      target: "mcp",
      getAccessToken,
      invalidate,
      accountCacheKey: async () => "oauth:11111111-2222-4333-8444-555555555555",
    };
    const bootstrap = createTickTickCommandBootstrap({
      readPreferences: preferences({ authMode: "oauth" }),
      cachePort: new InMemoryCachePort(),
      createAuthProvider: () => auth,
      createRemoteBackend: () => fakeBackend("mcp"),
    });

    const input = await bootstrap();
    expect(input.accountKey).toBe("oauth:11111111-2222-4333-8444-555555555555");
    await input.onReconnect?.();
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });
});

describe("loadTickTickAiToolRuntime", () => {
  it("projects the ready command runtime into the backend-neutral AI surface", async () => {
    const bootstrap = createTickTickCommandBootstrap({
      readPreferences: preferences({ authMode: "oauth" }),
      cachePort: new InMemoryCachePort(),
      createAuthProvider: () => ({
        target: "mcp",
        getAccessToken: async () => "access-token",
        invalidate: async () => undefined,
        accountCacheKey: async () => "oauth:11111111-2222-4333-8444-555555555555",
      }),
      createRemoteBackend: () => fakeBackend("mcp", "account-1"),
    });

    const runtime = await loadTickTickAiToolRuntime(bootstrap);
    expect(runtime.backendId).toBe("mcp");
    expect(runtime.accountKey).toBe("account-1");
    expect(runtime.capabilities).toEqual({ create: true });
    expect(runtime.taskService.listProjects).toBeTypeOf("function");
    expect(runtime.createTask).toBeTypeOf("function");
  });
});

describe("resolveUiTimeZone", () => {
  it("returns a concrete IANA time zone", () => {
    expect(resolveUiTimeZone()).toMatch(/[A-Za-z]+/);
  });
});
