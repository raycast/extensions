import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";

import { raycastState } from "./raycast-mock";

type SavedToolsAi = typeof import("../src/lib/saved-tools-ai");
type SavedTools = typeof import("../src/lib/saved-tools");
let savedToolsAi: SavedToolsAi;
let savedTools: SavedTools;
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  savedToolsAi = await import("../src/lib/saved-tools-ai");
  savedTools = await import("../src/lib/saved-tools");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  raycastState.inbox.clear();
  raycastState.failWrites = false;
});

function response(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
}

const tool = {
  address: "github.user.default.issues_create",
  owner: "user" as const,
  integration: "github",
  connection: "default",
  name: "issues_create",
  pluginId: "openapi",
  description: "Create an issue",
};

describe("saved tool AI parity", () => {
  test("fingerprints the canonical reviewed saved state", () => {
    const first = savedToolsAi.savedToolFingerprint({
      id: "preset-1",
      title: "Bug report",
      tool,
      args: { body: { title: "Bug", labels: ["one", "two"] }, draft: false },
    });
    const reordered = savedToolsAi.savedToolFingerprint({
      id: "preset-1",
      title: "Bug report",
      tool,
      args: { draft: false, body: { labels: ["one", "two"], title: "Bug" } },
    });
    const changed = savedToolsAi.savedToolFingerprint({
      id: "preset-1",
      title: "Bug report",
      tool,
      args: { draft: true, body: { labels: ["one", "two"], title: "Bug" } },
    });

    expect(first).toBe(reordered);
    expect(first).not.toBe(changed);
  });

  test("uses the native favorite ID and bounds list output", async () => {
    globalThis.fetch = mock(async () => response([tool])) as typeof fetch;
    await savedToolsAi.saveExecutorFavorite({ address: tool.address, title: "Create issue" });

    const saved = await savedTools.loadSavedTools();
    expect(saved[0].id).toBe(tool.address);
    const listed = await savedToolsAi.listExecutorSavedTools({ limit: 1 });
    expect(listed.savedTools[0]).toMatchObject({ id: tool.address, kind: "favorite" });
  });

  test("saves and updates a preset without changing its generated ID", async () => {
    globalThis.fetch = mock(async () => response([tool])) as typeof fetch;
    const created = await savedToolsAi.saveExecutorPreset({
      address: tool.address,
      title: "Bug report",
      argumentsJson: '{"title":"Bug"}',
    });

    const id = created.savedTool.id;
    const updated = await savedToolsAi.updateExecutorSavedTool({
      savedToolId: id,
      savedToolFingerprint: created.savedTool.savedToolFingerprint,
      title: "Updated report",
      argumentsJson: '{"title":"Fixed","draft":false}',
    });

    expect(updated.savedTool).toMatchObject({
      id,
      title: "Updated report",
      kind: "preset",
      arguments: { title: "Fixed", draft: false },
    });
  });

  test("updates a favorite title but does not turn it into an unreviewed preset", async () => {
    await savedTools.saveTool({ id: tool.address, title: "Favorite", tool });
    const current = await savedToolsAi.getExecutorSavedTool({ savedToolId: tool.address });

    const confirmation = await savedToolsAi.updateSavedToolConfirmation({
      savedToolId: tool.address,
      savedToolFingerprint: current.savedTool.savedToolFingerprint,
      title: "Create issue",
    });
    expect(confirmation.info?.some((field) => field.name === "New Arguments")).toBe(false);

    const updated = await savedToolsAi.updateExecutorSavedTool({
      savedToolId: tool.address,
      savedToolFingerprint: current.savedTool.savedToolFingerprint,
      title: "Create issue",
    });

    expect(updated.savedTool).toMatchObject({ id: tool.address, title: "Create issue", kind: "favorite" });
    await expect(
      savedToolsAi.updateExecutorSavedTool({
        savedToolId: tool.address,
        savedToolFingerprint: updated.savedTool.savedToolFingerprint,
        argumentsJson: '{"title":"Bug"}',
      }),
    ).rejects.toThrow("Favorites cannot store inputs");
  });

  test("executes a preset through the standard policy path without automatic approval", async () => {
    const preset = { id: "preset-1", title: "Bug report", tool, args: { title: "Bug" } };
    await savedTools.saveTool(preset);
    let body: Record<string, unknown> | undefined;
    globalThis.fetch = mock(async (_request: RequestInfo | URL, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return response({ status: "completed", text: "Done", structured: { result: { ok: true } }, isError: false });
    }) as typeof fetch;

    const result = await savedToolsAi.executeExecutorSavedTool({
      savedToolId: "preset-1",
      savedToolFingerprint: savedToolsAi.savedToolFingerprint(preset),
    });

    expect(result.status).toBe("completed");
    expect(body?.autoApprove).toBeNull();
    expect(String(body?.code)).toContain("github.user.default.issues_create");
  });

  test("does not execute a favorite that has no reviewed inputs", async () => {
    const favorite = { id: tool.address, title: "Favorite", tool };
    await savedTools.saveTool(favorite);
    await expect(
      savedToolsAi.executeExecutorSavedTool({
        savedToolId: tool.address,
        savedToolFingerprint: savedToolsAi.savedToolFingerprint(favorite),
      }),
    ).rejects.toThrow("favorite without inputs");
  });

  test("refuses changed preset inputs after confirmation without executing", async () => {
    const preset = { id: "preset-1", title: "Bug report", tool, args: { title: "Bug" } };
    const savedToolFingerprint = savedToolsAi.savedToolFingerprint(preset);
    await savedTools.saveTool(preset);
    await savedToolsAi.executeSavedToolConfirmation({ savedToolId: preset.id, savedToolFingerprint });
    await savedTools.saveTool({ ...preset, args: { title: "Changed after review" } });
    let executions = 0;
    globalThis.fetch = mock(async () => {
      executions += 1;
      return response({ status: "completed", text: "Done", structured: {}, isError: false });
    }) as typeof fetch;

    await expect(
      savedToolsAi.executeExecutorSavedTool({ savedToolId: preset.id, savedToolFingerprint }),
    ).rejects.toThrow("changed");
    expect(executions).toBe(0);
  });

  test("removes only an exact existing saved ID", async () => {
    const preset = { id: "preset-1", title: "Bug report", tool, args: { title: "Bug" } };
    const savedToolFingerprint = savedToolsAi.savedToolFingerprint(preset);
    await savedTools.saveTool(preset);
    await savedToolsAi.removeExecutorSavedTool({ savedToolId: "preset-1", savedToolFingerprint });
    expect(await savedTools.loadSavedTools()).toEqual([]);
    await expect(
      savedToolsAi.removeExecutorSavedTool({ savedToolId: "preset-1", savedToolFingerprint }),
    ).rejects.toThrow("not found");
  });
});
