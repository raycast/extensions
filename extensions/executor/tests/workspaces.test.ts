import { beforeEach, describe, expect, test } from "bun:test";
import { raycastState } from "./raycast-mock";
const { accountCacheKey, listIntegrations } = await import("../src/lib/client");
const {
  activateWorkspace,
  listWorkspaces,
  normalizeServerUrl,
  removeWorkspace,
  resolveWorkspace,
  runInWorkspace,
  saveWorkspace,
  workspaceIdFor,
  workspaceTitle,
} = await import("../src/lib/workspaces");
import type { Workspace } from "../src/lib/workspaces";

const originalPreferences = { ...raycastState.preferences };
const makeWorkspace = (name: string, apiKey: string): Workspace => ({
  id: workspaceIdFor("https://executor.test", apiKey),
  name,
  baseUrl: "https://executor.test",
  apiKey,
  organizationSlug: name.toLowerCase(),
  defaultOwner: "user",
});

beforeEach(() => {
  raycastState.inbox.clear();
  raycastState.failWrites = false;
  raycastState.preferences = { ...originalPreferences };
});

describe("Workspace isolation", () => {
  test("exposes existing preferences without copying their key to storage", async () => {
    const profiles = await listWorkspaces();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].isLegacy).toBe(true);
    expect(raycastState.inbox.size).toBe(0);
    expect(runInWorkspace(profiles[0], accountCacheKey)).toBe(accountCacheKey());
  });

  test("renaming the preferences workspace keeps identity and its removal guard", async () => {
    const [legacy] = await listWorkspaces();
    await saveWorkspace({ ...legacy, name: "Personal" });
    const profiles = await listWorkspaces();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe("Personal");
    expect(profiles[0].isLegacy).toBe(true);
    await expect(removeWorkspace(legacy.id)).rejects.toThrow("preferences");
  });

  test("native titles distinguish two profiles in the same organization", () => {
    const first = { ...makeWorkspace("My Account", "first-key"), organizationSlug: "bravas" };
    const second = { ...makeWorkspace("Shared Account", "second-key"), organizationSlug: "bravas" };
    expect(runInWorkspace(first, () => workspaceTitle("Tools"))).toBe("Tools · My Account");
    expect(runInWorkspace(second, () => workspaceTitle("Tools"))).toBe("Tools · Shared Account");
  });

  test("renamed and verified legacy profiles still use current visibility preferences", async () => {
    const [legacy] = await listWorkspaces();
    await saveWorkspace({ ...legacy, name: "Personal", organizationSlug: "personal" });
    raycastState.preferences.defaultOwner = "org";
    const resolved = await resolveWorkspace(legacy.id);
    expect(resolved.defaultOwner).toBe("org");
    expect(resolved.name).toBe("Personal");
    expect(resolved.organizationSlug).toBe("personal");
    expect(runInWorkspace(resolved, accountCacheKey)).toBe(accountCacheKey());
  });

  test("replacement credentials cannot retarget an existing workspace ID", async () => {
    const personal = makeWorkspace("Personal", "personal-key");
    await saveWorkspace(personal);
    await expect(saveWorkspace({ ...personal, apiKey: "other-key" })).rejects.toThrow("identity");
    expect(workspaceIdFor(personal.baseUrl, "other-key")).not.toBe(personal.id);
    expect((await resolveWorkspace(personal.id)).apiKey).toBe("personal-key");
  });

  test("missing explicit and stale active profiles fail rather than falling back", async () => {
    await expect(resolveWorkspace("missing")).rejects.toThrow("no longer configured");
    raycastState.inbox.set("active-workspace", "missing");
    await expect(resolveWorkspace()).rejects.toThrow("no longer configured");
  });

  test("switching active workspace cannot redirect an in-flight scoped request", async () => {
    const personal = makeWorkspace("Personal", "personal-key");
    const bravas = makeWorkspace("Bravas", "bravas-key");
    await saveWorkspace(personal);
    await saveWorkspace(bravas);
    await activateWorkspace(personal.id);
    const originalFetch = globalThis.fetch;
    const auth: string[] = [];
    globalThis.fetch = (async (_url: unknown, options?: RequestInit) => {
      auth.push(new Headers(options?.headers).get("Authorization") ?? "");
      expect(options?.redirect).toBe("error");
      return new Response("[]");
    }) as typeof fetch;
    try {
      const frozenPersonal = await resolveWorkspace();
      await runInWorkspace(frozenPersonal, async () => {
        const cache = accountCacheKey();
        await activateWorkspace(bravas.id);
        await listIntegrations();
        expect(accountCacheKey()).toBe(cache);
        expect(workspaceTitle("Tools")).toContain("Personal");
      });
      await runInWorkspace(await resolveWorkspace(), listIntegrations);
      expect(auth).toEqual(["Bearer personal-key", "Bearer bravas-key"]);
      expect(runInWorkspace(personal, accountCacheKey)).not.toBe(runInWorkspace(bravas, accountCacheKey));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("removing a profile selects another but does not erase saved account data", async () => {
    const added = makeWorkspace("Other", "other-key");
    await saveWorkspace(added);
    await activateWorkspace(added.id);
    raycastState.inbox.set("saved-tools:example", "[]");
    await removeWorkspace(added.id);
    expect((await resolveWorkspace()).id).not.toBe(added.id);
    expect(raycastState.inbox.get("saved-tools:example")).toBe("[]");
    await expect(resolveWorkspace(added.id)).rejects.toThrow("no longer configured");
  });

  test("rejects unsafe server URLs before any key could be sent", () => {
    for (const value of [
      "http://executor.test",
      "https://user:secret@executor.test",
      "https://executor.test/path",
      "https://executor.test?key=secret",
    ]) {
      expect(() => normalizeServerUrl(value)).toThrow();
    }
    expect(normalizeServerUrl("http://127.0.0.1:4788/")).toBe("http://127.0.0.1:4788");
  });
});
