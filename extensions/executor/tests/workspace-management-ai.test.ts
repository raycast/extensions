import { afterEach, beforeEach, expect, test, mock } from "bun:test";
import { raycastState } from "./raycast-mock";
const { saveWorkspace, workspaceIdFor, resolveWorkspace, activeWorkspaceId } = await import("../src/lib/workspaces");
const { default: manageWorkspace, confirmation } = await import("../src/tools/manage-workspace");
const { default: openView } = await import("../src/tools/open-executor-view");
const { default: getApproval } = await import("../src/tools/get-approval");
const { default: openPage } = await import("../src/tools/open-executor-page");
const preferences = raycastState.preferences;
const originalFetch = globalThis.fetch;
const workspace = {
  id: workspaceIdFor("https://workspace.test", "private-key"),
  name: "Original",
  baseUrl: "https://workspace.test",
  apiKey: "private-key",
};

beforeEach(async () => {
  raycastState.inbox.clear();
  raycastState.launches = [];
  raycastState.preferencesOpened = 0;
  raycastState.openedUrls = [];
  raycastState.preferences = { ...preferences, apiKey: "" };
  await saveWorkspace(workspace);
});
afterEach(() => {
  raycastState.inbox.clear();
  raycastState.preferences = preferences;
  globalThis.fetch = originalFetch;
});

test("rename preserves credential identity and switch is explicit", async () => {
  const input = { workspaceId: workspace.id, operation: "rename" as const, name: "Renamed" };
  const details = await confirmation(input);
  expect(JSON.stringify(details)).not.toContain("private-key");
  const result = await manageWorkspace(input);
  expect(result.profile?.name).toBe("Renamed");
  expect((await resolveWorkspace(workspace.id)).apiKey).toBe("private-key");
  expect(await activeWorkspaceId()).toBeUndefined();
  await manageWorkspace({ workspaceId: workspace.id, operation: "switch" });
  expect(await activeWorkspaceId()).toBe(workspace.id);
});

test("remove deletes only the selected profile and rejects the preference-backed profile", async () => {
  raycastState.preferences = { ...preferences, apiKey: workspace.apiKey, baseUrl: workspace.baseUrl };
  await expect(manageWorkspace({ workspaceId: workspace.id, operation: "remove" })).rejects.toThrow("preferences");
  raycastState.preferences = { ...preferences, apiKey: "" };
  await manageWorkspace({ workspaceId: workspace.id, operation: "remove" });
  await expect(resolveWorkspace(workspace.id)).rejects.toThrow("no longer configured");
});

test("new workspace setup opens a native credential form without taking credentials in tool arguments", async () => {
  const result = await openView({ view: "add-workspace" });
  expect(result.status).toBe("opened");
  expect(raycastState.launches).toEqual([{ name: "workspaces", type: "userInitiated", context: { intent: "add" } }]);
  await expect(openView({ view: "search-tools", workspaceId: "original" })).rejects.toThrow("stable workspace ID");
  await openView({ view: "search-tools", workspaceId: workspace.id });
  expect(raycastState.launches.at(-1)).toEqual({
    name: "search-tools",
    type: "userInitiated",
    context: { workspaceId: workspace.id },
  });
  expect(await activeWorkspaceId()).toBeUndefined();
});

test("approval lookup returns fresh terms and fingerprint but cannot approve them", async () => {
  globalThis.fetch = mock(async (_url, init) => {
    expect(init?.method).toBeUndefined();
    return new Response(
      JSON.stringify({
        text: "Review",
        structured: {
          status: "waiting_for_interaction",
          executionId: "run-1",
          interaction: { type: "confirmation", message: "Approve this tool?" },
        },
      }),
    );
  }) as typeof fetch;
  const result = await getApproval({ workspaceId: workspace.id, executionId: "run-1" });
  expect(result.status).toBe("paused");
  expect("pauseFingerprint" in result && result.pauseFingerprint).toMatch(/^[a-f0-9]{64}$/);
  await expect(getApproval({ workspaceId: workspace.id, executionId: "different" })).rejects.toThrow(
    "matching server-stored terms",
  );
});

test("browser navigation uses the API principal workspace and preserves paused handoffs", async () => {
  globalThis.fetch = mock(
    async () =>
      new Response(
        JSON.stringify({
          status: "completed",
          text: "",
          structured: {
            result: {
              ok: true,
              data: {
                url: "https://workspace.test/verified-org/integrations/executor?addAccount=1",
                instructions: "Continue",
              },
            },
          },
        }),
      ),
  ) as typeof fetch;
  await openPage({ workspaceId: workspace.id, page: "artifact", identifier: "art-1" });
  expect(raycastState.openedUrls).toEqual(["https://workspace.test/verified-org/artifacts/art-1"]);
  await expect(openPage({ workspaceId: workspace.id, page: "artifact", identifier: "../other" })).rejects.toThrow(
    "exact integration slug or artifact ID",
  );
  globalThis.fetch = mock(
    async () =>
      new Response(
        JSON.stringify({
          status: "paused",
          text: "Review",
          structured: {
            status: "waiting_for_interaction",
            executionId: "run-1",
            interaction: { type: "confirmation", message: "Approve?" },
          },
        }),
      ),
  ) as typeof fetch;
  const result = await openPage({ workspaceId: workspace.id, page: "policies" });
  expect(result.status).toBe("paused");
  expect(raycastState.openedUrls).toHaveLength(1);
});

test("update edits the connection filter without changing workspace identity or omitted name", async () => {
  const input = { workspaceId: workspace.id, operation: "update" as const, defaultOwner: "org" as const };
  await manageWorkspace(input);
  const updated = await resolveWorkspace(workspace.id);
  expect(updated.name).toBe(workspace.name);
  expect(updated.apiKey).toBe(workspace.apiKey);
  expect(updated.defaultOwner).toBe("org");
  await expect(manageWorkspace({ ...input, defaultOwner: "invalid" as "org" })).rejects.toThrow(
    "valid connection filter",
  );
});
