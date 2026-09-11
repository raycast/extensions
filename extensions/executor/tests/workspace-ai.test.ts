import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { raycastState } from "./raycast-mock";

const { preferences } = await import("../src/lib/client");
const {
  confirmInAiWorkspace,
  confirmInRequiredAiWorkspace,
  inAiWorkspace,
  inRequiredAiWorkspace,
  listAiWorkspaces,
  resolveAiWorkspace,
} = await import("../src/lib/workspace-ai");
const { saveWorkspace, workspaceIdFor } = await import("../src/lib/workspaces");
import type { Workspace } from "../src/lib/workspaces";

const originalPreferences = raycastState.preferences;

function fixture(name: string, baseUrl: string, apiKey: string, organizationSlug?: string): Workspace {
  return {
    id: workspaceIdFor(baseUrl, apiKey),
    name,
    baseUrl,
    apiKey,
    organizationSlug,
  };
}

beforeEach(() => {
  raycastState.inbox.clear();
  raycastState.preferences = { ...originalPreferences, apiKey: "" };
});

afterEach(() => {
  raycastState.inbox.clear();
  raycastState.preferences = originalPreferences;
});

describe("AI workspace routing", () => {
  test("resolves unique aliases for reads and returns the canonical ID", async () => {
    const personal = fixture("Personal", "https://personal.example", "personal-key");
    await saveWorkspace(personal);
    await saveWorkspace(fixture("Bravas", "https://company.example", "company-key"));
    const result = await inAiWorkspace({ workspaceId: " PERSONAL " }, () => ({ server: preferences().baseUrl }));
    expect(result.workspace.id).toBe(personal.id);
    expect(result.server).toBe(personal.baseUrl);
    expect((await listAiWorkspaces()).workspaces.map((workspace) => workspace.alias)).toEqual(["personal", "bravas"]);
  });

  test("rejects colliding aliases instead of selecting a workspace", async () => {
    await saveWorkspace(fixture("My Work", "https://first.example", "first-key"));
    await saveWorkspace(fixture("My-Work", "https://second.example", "second-key"));
    await expect(resolveAiWorkspace("my-work")).rejects.toThrow("ambiguous");
    expect((await listAiWorkspaces()).workspaces.every((workspace) => !workspace.alias)).toBe(true);
  });

  test("never reinterprets an unknown canonical ID as an alias", async () => {
    const removedId = workspaceIdFor("https://removed.example", "removed-key");
    await saveWorkspace(fixture(removedId, "https://replacement.example", "replacement-key"));
    await expect(resolveAiWorkspace(removedId)).rejects.toThrow("no longer configured");
    expect((await listAiWorkspaces()).workspaces[0].alias).toBeUndefined();
    await expect(inRequiredAiWorkspace({ workspaceId: removedId }, () => ({ ok: true }))).rejects.toThrow(
      "no longer configured",
    );
  });

  test("never accepts an alias for execution or confirmation even after reassignment", async () => {
    const personal = fixture("Personal", "https://personal.example", "personal-key");
    await saveWorkspace(personal);
    await saveWorkspace({ ...personal, name: "Archived" });
    await saveWorkspace(fixture("Personal", "https://replacement.example", "replacement-key"));
    let invoked = false;
    const callback = () => {
      invoked = true;
      return { message: "Continue?" };
    };
    expect(() => inRequiredAiWorkspace({ workspaceId: "personal" }, callback)).toThrow("stable workspace ID");
    expect(() => confirmInRequiredAiWorkspace({ workspaceId: "personal" }, callback)).toThrow("stable workspace ID");
    expect(invoked).toBe(false);
    expect((await resolveAiWorkspace(personal.id)).baseUrl).toBe(personal.baseUrl);
  });

  test("requires an explicit workspace when multiple profiles exist", async () => {
    await saveWorkspace(fixture("Personal", "https://personal.example", "personal-key"));
    await saveWorkspace(fixture("Company", "https://company.example", "company-key"));

    await expect(resolveAiWorkspace()).rejects.toThrow("Call list-workspaces");
  });

  test("requires a non-empty workspace ID for mutation tools", async () => {
    await saveWorkspace(fixture("Personal", "https://personal.example", "personal-key"));

    expect(() => inRequiredAiWorkspace({}, async () => ({ ok: true }))).toThrow("Workspace ID is required");
    expect(() => inRequiredAiWorkspace({ workspaceId: "  " }, async () => ({ ok: true }))).toThrow(
      "Workspace ID is required",
    );
  });

  test("keeps concurrent callbacks scoped to their exact workspace without changing the active profile", async () => {
    const personal = fixture("Personal", "https://personal.example", "personal-key");
    const company = fixture("Company", "https://company.example", "company-key");
    await saveWorkspace(personal);
    await saveWorkspace(company);

    const [personalResult, companyResult] = await Promise.all([
      inAiWorkspace({ workspaceId: personal.id }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { baseUrl: preferences().baseUrl, apiKey: preferences().apiKey };
      }),
      inAiWorkspace({ workspaceId: company.id }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return { baseUrl: preferences().baseUrl, apiKey: preferences().apiKey };
      }),
    ]);

    expect(personalResult).toMatchObject({
      baseUrl: personal.baseUrl,
      apiKey: personal.apiKey,
      workspace: { id: personal.id, name: personal.name, server: personal.baseUrl },
    });
    expect(companyResult).toMatchObject({
      baseUrl: company.baseUrl,
      apiKey: company.apiKey,
      workspace: { id: company.id, name: company.name, server: company.baseUrl },
    });
    expect(raycastState.inbox.has("active-workspace")).toBe(false);
  });

  test("returns sanitized workspace metadata", async () => {
    const workspace = fixture("Personal", "https://personal.example", "private-key");
    await saveWorkspace(workspace);

    const result = await inAiWorkspace({ workspaceId: workspace.id }, async () => ({ ok: true }));
    expect(result.workspace).toEqual({
      id: workspace.id,
      name: "Personal",
      server: "https://personal.example",
      organization: undefined,
    });
    expect(JSON.stringify(result)).not.toContain("private-key");
  });

  test("prepends workspace, server, and organization to confirmation details", async () => {
    const workspace = fixture("Company", "https://company.example", "company-key", "example-company");
    await saveWorkspace(workspace);

    const confirmation = await confirmInAiWorkspace({ workspaceId: workspace.id }, async () => ({
      message: "Continue?",
      info: [{ name: "Tool", value: "example.run" }],
    }));
    expect(confirmation.info).toEqual([
      { name: "Workspace", value: "Company" },
      { name: "Server", value: "https://company.example" },
      { name: "Organization", value: "example-company" },
      { name: "Tool", value: "example.run" },
    ]);
  });

  test("fails closed for an unknown workspace ID", async () => {
    await saveWorkspace(fixture("Personal", "https://personal.example", "personal-key"));
    await expect(resolveAiWorkspace("missing-workspace")).rejects.toThrow("no longer configured");
  });

  test("lists no active workspace when empty and falls back from a stale selection", async () => {
    expect(await listAiWorkspaces()).toEqual({ activeWorkspaceId: undefined, workspaces: [] });

    const workspace = fixture("Personal", "https://personal.example", "personal-key");
    await saveWorkspace(workspace);
    raycastState.inbox.set("active-workspace", "stale-workspace");

    const result = await listAiWorkspaces();
    expect(result.activeWorkspaceId).toBe(workspace.id);
    expect(result.workspaces).toHaveLength(1);
    expect(raycastState.inbox.get("active-workspace")).toBe("stale-workspace");
  });
});
