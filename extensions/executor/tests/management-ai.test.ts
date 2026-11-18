import { afterEach, expect, test, mock } from "bun:test";
import { raycastState } from "./raycast-mock";
import type { Policy } from "../src/lib/policies";
const { saveIntegrationMetadata, integrationMetadataConfirmation } = await import("../src/lib/integration-metadata");
const { changeAiPolicy, policyChangeConfirmation, listAiPolicies, policyFingerprint } =
  await import("../src/lib/policy-ai");
const { saveWorkspace, workspaceIdFor } = await import("../src/lib/workspaces");
const { default: updateIntegration, confirmation: confirmIntegration } =
  await import("../src/tools/update-integration");
const originalFetch = globalThis.fetch;
const originalPreferences = raycastState.preferences;

afterEach(() => {
  globalThis.fetch = originalFetch;
  raycastState.inbox.clear();
  raycastState.preferences = originalPreferences;
});

const policy: Policy = {
  id: "policy-1",
  owner: "org",
  pattern: "github.*",
  action: "block",
  position: "1",
  createdAt: 1,
  updatedAt: 1,
};
const integration = { slug: "github", name: "GitHub", description: "Old", kind: "openapi", authMethods: [] };
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

test("description updates preserve omitted name and explicitly clear only the description", async () => {
  const calls: { url: string; method?: string; body?: unknown }[] = [];
  globalThis.fetch = mock(async (url, init) => {
    calls.push({
      url: String(url),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return response({ ...integration, description: "" });
  }) as typeof fetch;
  await saveIntegrationMetadata({ integration: "github", description: "" });
  expect(calls).toEqual([
    { url: "https://executor.test/api/integrations/github", method: "PATCH", body: { description: "" } },
  ]);
  await expect(saveIntegrationMetadata({ integration: "github" })).rejects.toThrow("Provide a name");
  await expect(saveIntegrationMetadata({ integration: "github", name: " " })).rejects.toThrow("integration name");
  await expect(saveIntegrationMetadata({ integration: "..", description: "x" })).rejects.toThrow(
    "exact integration slug",
  );
  expect(calls).toHaveLength(1);
});

test("metadata confirmation is read-only and names the actual target and normalized changes", async () => {
  globalThis.fetch = mock(async (_url, init) => {
    expect(init?.method).toBeUndefined();
    return response(integration);
  }) as typeof fetch;
  const details = await integrationMetadataConfirmation({ integration: "github", description: " New " });
  expect(details.info).toContainEqual({ name: "Integration", value: "GitHub" });
  expect(details.info).toContainEqual({ name: "Changes", value: '{\n  "description": "New"\n}' });
});

test("metadata API denial propagates without retry or an execution fallback", async () => {
  const fetchMock = mock(async () => response({ _tag: "Forbidden" }, 403));
  globalThis.fetch = fetchMock as typeof fetch;
  await expect(saveIntegrationMetadata({ integration: "github", description: "New" })).rejects.toThrow("permission");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("the metadata entrypoint rejects aliases and routes confirmation and update to the exact profile", async () => {
  raycastState.preferences = { ...originalPreferences, apiKey: "" };
  const ws = {
    id: workspaceIdFor("https://second.test", "second-key"),
    name: "Second",
    baseUrl: "https://second.test",
    apiKey: "second-key",
  };
  await saveWorkspace(ws);
  const calls: string[] = [];
  globalThis.fetch = mock(async (url, init) => {
    calls.push(String(url));
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer second-key");
    return response(integration);
  }) as typeof fetch;
  expect(() => updateIntegration({ workspaceId: "second", integration: "github", description: "New" })).toThrow(
    "stable workspace ID",
  );
  const input = { workspaceId: ws.id, integration: "github", description: "New" };
  const details = await confirmIntegration(input);
  expect(details.info).toContainEqual({ name: "Workspace", value: "Second" });
  expect((await updateIntegration(input)).workspace.id).toBe(ws.id);
  expect(calls).toEqual(["https://second.test/api/integrations/github", "https://second.test/api/integrations/github"]);
});

test("policy listing preserves fingerprints and pagination; a reviewed change retains scope", async () => {
  const requests: { method?: string; body?: unknown }[] = [];
  globalThis.fetch = mock(async (_url, init) => {
    requests.push({ method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return response(init?.method ? policy : [policy, { ...policy, id: "policy-2" }]);
  }) as typeof fetch;
  const page = await listAiPolicies({ limit: 1 });
  expect(page.nextOffset).toBe(1);
  const input = {
    operation: "update" as const,
    owner: "org" as const,
    policyId: policy.id,
    policyFingerprint: page.policies[0].policyFingerprint,
    action: "require_approval" as const,
  };
  const details = await policyChangeConfirmation(input);
  expect(details.info?.at(-1)?.value).toContain("Require Approval");
  await changeAiPolicy(input);
  expect(requests.at(-1)).toEqual({
    method: "PATCH",
    body: { owner: "org", pattern: "github.*", action: "require_approval" },
  });
});

test("changed or wrong-scope policies cannot be mutated with an old review fingerprint", async () => {
  globalThis.fetch = mock(async (_url, init) => {
    expect(init?.method).toBeUndefined();
    return response([{ ...policy, action: "approve" }]);
  }) as typeof fetch;
  await expect(
    changeAiPolicy({
      operation: "delete",
      owner: "org",
      policyId: policy.id,
      policyFingerprint: policyFingerprint(policy),
    }),
  ).rejects.toThrow("changed or is unavailable");
  await expect(
    changeAiPolicy({
      operation: "update",
      owner: "user",
      policyId: policy.id,
      policyFingerprint: policyFingerprint(policy),
      pattern: "*",
    }),
  ).rejects.toThrow("changed or is unavailable");
});

test("policy create validates grammar and deletion requires a confirmed server removal", async () => {
  const fetchMock = mock(async (_url: RequestInfo | URL, init?: RequestInit) =>
    response(init?.method ? { removed: false } : [policy]),
  );
  globalThis.fetch = fetchMock as typeof fetch;
  await expect(
    changeAiPolicy({ operation: "create", owner: "org", pattern: "github.fo*", action: "approve" }),
  ).rejects.toThrow("wildcard");
  expect(fetchMock).not.toHaveBeenCalled();
  await expect(
    changeAiPolicy({
      operation: "delete",
      owner: "org",
      policyId: policy.id,
      policyFingerprint: policyFingerprint(policy),
    }),
  ).rejects.toThrow("did not remove");
});
