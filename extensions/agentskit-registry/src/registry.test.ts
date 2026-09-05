import { afterEach, describe, expect, it, vi } from "vitest";
import {
  agentDefinitionUrl,
  agentPageUrl,
  fetchAgents,
  fetchRunnableDefinition,
  installCommand,
  isSafeAgentId,
  parseAgent,
  parseRunnableDefinition,
} from "./registry";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("registry parsing", () => {
  it("parses a runnable index entry", () => {
    expect(
      parseAgent({
        id: "researcher",
        title: "Researcher",
        description: "Researches a topic",
        category: "research",
        tags: ["sources"],
        packages: ["@agentskit/runtime"],
        installable: true,
        runnable: true,
      }),
    ).toMatchObject({
      id: "researcher",
      runnable: true,
      installable: true,
      tags: ["sources"],
    });
  });

  it("rejects malformed index entries", () => {
    expect(parseAgent({ id: "missing-fields" })).toBeUndefined();
    expect(
      parseAgent({
        id: "writer; rm -rf project",
        title: "Unsafe",
        description: "Unsafe ID",
        category: "content",
      }),
    ).toBeUndefined();
    expect(parseAgent(null)).toBeUndefined();
  });

  it("parses a portable agent definition", () => {
    expect(
      parseRunnableDefinition({
        id: "researcher",
        title: "Researcher",
        runnable: true,
        skill: { systemPrompt: "Research carefully." },
      }),
    ).toEqual({
      id: "researcher",
      title: "Researcher",
      systemPrompt: "Research carefully.",
    });
  });

  it("rejects definitions without a portable prompt", () => {
    expect(() =>
      parseRunnableDefinition({
        id: "tool-only",
        title: "Tool Only",
        skill: null,
      }),
    ).toThrow("does not expose a portable prompt");
  });

  it("loads and sorts valid agents from the public index shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          agents: [
            {
              id: "writer",
              title: "Writer",
              description: "Writes",
              category: "content",
              tags: [],
              packages: [],
              runnable: true,
            },
            { id: "invalid" },
            {
              id: "analyst",
              title: "Analyst",
              description: "Analyzes",
              category: "research",
              tags: [],
              packages: [],
              runnable: true,
            },
          ],
        }),
      })),
    );

    await expect(fetchAgents()).resolves.toEqual([
      expect.objectContaining({ id: "analyst" }),
      expect.objectContaining({ id: "writer" }),
    ]);
  });

  it("surfaces registry failures and malformed indexes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 })),
    );
    await expect(fetchAgents()).rejects.toThrow("Registry returned 503");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ agents: "invalid" }) })),
    );
    await expect(fetchAgents()).rejects.toThrow("unexpected response");
  });

  it("loads a runnable definition and encodes public URLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          id: "writer-pro",
          title: "Writer Pro",
          runnable: true,
          skill: { systemPrompt: "Write." },
        }),
      })),
    );

    await expect(fetchRunnableDefinition("writer-pro")).resolves.toMatchObject({ systemPrompt: "Write." });
    expect(agentPageUrl({ id: "writer/pro" })).toContain("writer%2Fpro");
    expect(agentDefinitionUrl({ id: "writer/pro" })).toContain("writer%2Fpro.json");
    expect(installCommand({ id: "writer" })).toBe("npx agentskit add writer");
    expect(isSafeAgentId("writer-v2.1")).toBe(true);
    expect(isSafeAgentId("--help")).toBe(false);
    expect(() => installCommand({ id: "writer; rm -rf project" })).toThrow("unsafe agent ID");
  });

  it("surfaces definition fetch failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404 })),
    );
    await expect(fetchRunnableDefinition("missing")).rejects.toThrow("404 for missing");
  });

  it("rejects a registry definition whose ID does not match the requested agent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          id: "different-agent",
          title: "Different Agent",
          skill: { systemPrompt: "Do something else." },
        }),
      })),
    );

    await expect(fetchRunnableDefinition("expected-agent")).rejects.toThrow(
      "expected expected-agent, received different-agent",
    );
  });
});
