import { afterEach, expect, mock, test } from "bun:test";
import { raycastState } from "./raycast-mock";
import type { DeletionTarget } from "../src/lib/deletions";
const { deletionConfirmation, deleteExecutorItem } = await import("../src/lib/deletions");
const { default: deleteIntegration, confirmation: confirmIntegration } =
  await import("../src/tools/delete-integration");
const { default: deleteConnection, confirmation: confirmConnection } = await import("../src/tools/delete-connection");
const { saveWorkspace, workspaceIdFor } = await import("../src/lib/workspaces");

const originalFetch = globalThis.fetch;
const originalPreferences = raycastState.preferences;
const integration = { slug: "github", name: "GitHub", canRemove: true };
const connection = {
  owner: "user",
  name: "main",
  integration: "github",
  address: "github.user.main",
  identityLabel: "My GitHub",
};
const connectionTarget: DeletionTarget = {
  kind: "connection",
  owner: "user",
  integration: "github",
  connection: "main",
};
const integrationTarget: DeletionTarget = { kind: "integration", integration: "github" };
afterEach(() => {
  globalThis.fetch = originalFetch;
  raycastState.preferences = originalPreferences;
  raycastState.inbox.clear();
});

test("deletion preparation only reads and describes the correct scope of removal", async () => {
  globalThis.fetch = mock(async (url, init) => {
    expect(init?.method).toBeUndefined();
    return Response.json(String(url).includes("/connections") ? [connection] : integration);
  }) as typeof fetch;
  const account = await deletionConfirmation(connectionTarget);
  expect(account.message).toContain("Tools using this connection");
  expect(account.info).toContainEqual({ name: "Connection", value: "My GitHub" });
  expect(account.info).toContainEqual({ name: "Connection Scope", value: "Personal" });
  expect(account.info).toContainEqual({ name: "Integration", value: "GitHub" });
  const app = await deletionConfirmation(integrationTarget);
  expect(app.message).toContain("its connections, and its tools");
});

test("protected or mismatched integrations cannot reach DELETE, including after confirmation", async () => {
  let current = integration;
  const calls: string[] = [];
  globalThis.fetch = mock(async (_url, init) => {
    calls.push(init?.method ?? "GET");
    return Response.json(current);
  }) as typeof fetch;
  await deletionConfirmation(integrationTarget);
  current = { ...integration, canRemove: false };
  await expect(deleteExecutorItem(integrationTarget)).rejects.toThrow("does not allow");
  current = { ...integration, slug: "other" };
  await expect(deleteExecutorItem(integrationTarget)).rejects.toThrow("changed");
  expect(calls).toEqual(["GET", "GET", "GET"]);
});

test("one connection is deleted using its exact owner, integration and name", async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  globalThis.fetch = mock(async (url, init) => {
    calls.push({ url: String(url), method: init?.method ?? "GET", body: init?.body });
    return Response.json(init?.method === "DELETE" ? { removed: true } : [{ ...connection, owner: "org" }, connection]);
  }) as typeof fetch;
  expect(await deleteExecutorItem(connectionTarget)).toMatchObject({ removed: true });
  expect(calls).toEqual([
    { url: "https://executor.test/api/connections?integration=github&owner=user", method: "GET", body: undefined },
    { url: "https://executor.test/api/connections/user/github/main", method: "DELETE", body: undefined },
  ]);
});

test("missing, ambiguous and wrong-owner connections cannot reach DELETE", async () => {
  for (const items of [[], [{ ...connection, owner: "org" }], [connection, connection]]) {
    globalThis.fetch = mock(async (_url, init) => {
      expect(init?.method).toBeUndefined();
      return Response.json(items);
    }) as typeof fetch;
    await expect(deleteExecutorItem(connectionTarget)).rejects.toThrow("exact connection was not found");
  }
});

test("integration deletion uses the management endpoint and requires an affirmative result", async () => {
  const deletes: string[] = [];
  let removed = false;
  globalThis.fetch = mock(async (url, init) => {
    if (init?.method !== "DELETE") return Response.json(integration);
    deletes.push(String(url));
    expect(init.body).toBeUndefined();
    return Response.json({ removed });
  }) as typeof fetch;
  await expect(deleteExecutorItem(integrationTarget)).rejects.toThrow("did not confirm deletion");
  expect(deletes).toHaveLength(1);
  removed = true;
  expect(await deleteExecutorItem(integrationTarget)).toMatchObject({ removed: true });
  expect(deletes).toEqual(Array(2).fill("https://executor.test/api/integrations/github"));
});

test("denied or uncertain writes are not retried or replaced with execution calls", async () => {
  for (const status of [403, 500, 0]) {
    let writes = 0;
    globalThis.fetch = mock(async (_url, init) => {
      if (init?.method !== "DELETE") return Response.json(integration);
      writes++;
      if (!status) throw new Error("Connection dropped");
      return Response.json({ _tag: "OrgWriteDeniedError" }, { status });
    }) as typeof fetch;
    await expect(deleteExecutorItem(integrationTarget)).rejects.toThrow();
    expect(writes).toBe(1);
  }
});

test("invalid path targets are rejected before a request", async () => {
  const fetchMock = mock(async () => Response.json(integration));
  globalThis.fetch = fetchMock as typeof fetch;
  for (const value of ["", ".", "..", "github/other"]) {
    await expect(deleteExecutorItem({ kind: "integration", integration: value })).rejects.toThrow();
  }
  await expect(deleteExecutorItem({ ...connectionTarget, connection: ".." })).rejects.toThrow();
  expect(fetchMock).toHaveBeenCalledTimes(0);
});

test("both AI deletions reject aliases and keep confirmation and writes in the exact workspace", async () => {
  raycastState.preferences = { ...originalPreferences, apiKey: "" };
  const workspace = {
    id: workspaceIdFor("https://second.test", "second-key"),
    name: "Second",
    baseUrl: "https://second.test",
    apiKey: "second-key",
  };
  await saveWorkspace(workspace);
  let writes = 0;
  globalThis.fetch = mock(async (url, init) => {
    expect(String(url).startsWith("https://second.test/api/")).toBe(true);
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer second-key");
    if (init?.method === "DELETE") {
      writes++;
      return Response.json({ removed: true });
    }
    return Response.json(String(url).includes("/connections") ? [connection] : integration);
  }) as typeof fetch;
  const connectionInput = {
    workspaceId: workspace.id,
    integration: "github",
    connection: "main",
    owner: "user" as const,
  };
  const integrationInput = { workspaceId: workspace.id, integration: "github" };
  expect(() => deleteConnection({ ...connectionInput, workspaceId: "second" })).toThrow("stable workspace ID");
  expect(() => confirmConnection({ ...connectionInput, workspaceId: "second" })).toThrow("stable workspace ID");
  expect(() => deleteIntegration({ ...integrationInput, workspaceId: "second" })).toThrow("stable workspace ID");
  expect(() => confirmIntegration({ ...integrationInput, workspaceId: "second" })).toThrow("stable workspace ID");
  const first = await confirmConnection(connectionInput);
  const second = await confirmIntegration(integrationInput);
  expect(first.info).toContainEqual({ name: "Workspace", value: "Second" });
  expect(second.info).toContainEqual({ name: "Workspace", value: "Second" });
  expect(writes).toBe(0);
  expect(await deleteConnection(connectionInput)).toMatchObject({ removed: true, workspace: { name: "Second" } });
  expect(await deleteIntegration(integrationInput)).toMatchObject({ removed: true, workspace: { name: "Second" } });
  expect(writes).toBe(2);
});

test("connection confirmation uses saved names without duplicate slugs", async () => {
  globalThis.fetch = mock(async (url) =>
    Response.json(
      String(url).includes("/connections")
        ? [{ ...connection, integration: "railway", name: "personal", identityLabel: "Personal" }]
        : { slug: "railway", name: "Railway Production" },
    ),
  ) as typeof fetch;
  const details = await deletionConfirmation({
    kind: "connection",
    owner: "user",
    integration: "railway",
    connection: "personal",
  });
  expect(details.info).toEqual([
    { name: "Integration", value: "Railway Production" },
    { name: "Connection Scope", value: "Personal" },
    { name: "Connection", value: "Personal" },
  ]);
});
