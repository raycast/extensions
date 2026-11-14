import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";

import "./raycast-mock";

type ArtifactAi = typeof import("../src/lib/artifact-ai");
let artifactAi: ArtifactAi;
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  artifactAi = await import("../src/lib/artifact-ai");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function response(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
}

const artifact = {
  id: "artifact/1",
  owner: "user" as const,
  title: "Current title",
  description: null,
  preview: null,
  code: "return null",
  bindings: { github: { integration: "github", owner: "user" as const, connection: "default" } },
  createdAt: 1,
  updatedAt: 1,
};

describe("artifact AI mutations", () => {
  test("confirms an exact artifact and proposed rename", async () => {
    globalThis.fetch = mock(async () => response(artifact)) as typeof fetch;

    const confirmation = await artifactAi.renameArtifactConfirmation({ artifactId: artifact.id, title: " New title " });

    expect(confirmation.info).toEqual([
      { name: "Artifact ID", value: artifact.id },
      { name: "Current Title", value: artifact.title },
      { name: "Changes", value: '{\n  "title": "New title"\n}' },
    ]);
  });

  test("updates a description through a full overwrite that preserves source and bindings", async () => {
    const calls: { url: string; method?: string; body?: unknown }[] = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(request),
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return response(calls.length === 1 ? artifact : { ...artifact, description: "New description" });
    }) as typeof fetch;

    const result = await artifactAi.renameExecutorArtifact({
      artifactId: artifact.id,
      description: " New description ",
    });

    expect(result.artifact.description).toBe("New description");
    expect(calls[1]).toEqual({
      url: "https://executor.test/api/artifacts",
      method: "POST",
      body: {
        id: artifact.id,
        title: artifact.title,
        description: "New description",
        code: artifact.code,
        bindings: artifact.bindings,
      },
    });
  });

  test("clears a description explicitly while preserving an existing preview", async () => {
    const withPreview = {
      ...artifact,
      description: "Old",
      preview: { kind: "layout" as const, markup: "<p>Preview</p>" },
    };
    const calls: { url: string; method?: string; body?: unknown }[] = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(request),
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      if (calls.length === 1) return response(withPreview);
      if (calls.length === 2) return response({ ...withPreview, description: null, preview: null });
      if (init?.method !== "PUT") return new Response("Method Not Allowed", { status: 405 });
      return response({ stored: true });
    }) as typeof fetch;

    const result = await artifactAi.renameExecutorArtifact({ artifactId: artifact.id, description: " " });

    expect(result.artifact.description).toBeNull();
    expect(result.artifact.preview).toEqual(withPreview.preview);
    expect(calls[2]).toEqual({
      url: "https://executor.test/api/artifacts/artifact%2F1/preview",
      method: "PUT",
      body: { preview: "<p>Preview</p>" },
    });
  });

  test("refuses a mismatched read target before sending an update", async () => {
    const calls: string[] = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL) => {
      calls.push(String(request));
      return response({ ...artifact, id: "artifact/other" });
    }) as typeof fetch;

    await expect(
      artifactAi.renameExecutorArtifact({ artifactId: artifact.id, description: "New description" }),
    ).rejects.toThrow("different artifact than requested");
    expect(calls).toEqual(["https://executor.test/api/artifacts/artifact%2F1"]);
  });

  test("rejects a stale expected update time before sending an update", async () => {
    const calls: string[] = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL) => {
      calls.push(String(request));
      return response({ ...artifact, updatedAt: 2 });
    }) as typeof fetch;

    await expect(
      artifactAi.renameExecutorArtifact({
        artifactId: artifact.id,
        expectedUpdatedAt: 1,
        description: "New description",
      }),
    ).rejects.toThrow("changed after it was opened");
    expect(calls).toEqual(["https://executor.test/api/artifacts/artifact%2F1"]);
  });

  test("reports partial success when preview refresh fails without retrying", async () => {
    const withPreview = { ...artifact, preview: { kind: "layout" as const, markup: "<p>Preview</p>" } };
    let calls = 0;
    const methods: string[] = [];
    globalThis.fetch = mock(async (_request: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      methods.push(init?.method ?? "GET");
      if (calls === 1) return response(withPreview);
      if (calls === 2) return response({ ...withPreview, description: "New", preview: null });
      return new Response(JSON.stringify({ _tag: "PreviewUnavailable" }), { status: 503 });
    }) as typeof fetch;

    await expect(artifactAi.renameExecutorArtifact({ artifactId: artifact.id, description: "New" })).rejects.toThrow(
      "details were saved, but its preview refresh failed. Refresh artifacts before retrying",
    );
    expect(calls).toBe(3);
    expect(methods).toEqual(["GET", "POST", "PUT"]);
  });

  test("confirms deletion without starting an Executor console handoff", async () => {
    const calls: string[] = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL) => {
      calls.push(String(request));
      return response(artifact);
    }) as typeof fetch;

    const confirmation = await artifactAi.deleteArtifactConfirmation({ artifactId: artifact.id });

    expect(confirmation.info).toEqual([
      { name: "Artifact ID", value: artifact.id },
      { name: "Title", value: artifact.title },
    ]);
    expect(calls).toEqual(["https://executor.test/api/artifacts/artifact%2F1"]);
  });

  test("renames through the native endpoint and verifies the returned target", async () => {
    const calls: { url: string; method?: string; body?: string }[] = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(request), method: init?.method, body: String(init?.body ?? "") });
      return response(calls.length === 1 ? artifact : { ...artifact, title: "New title" });
    }) as typeof fetch;

    const result = await artifactAi.renameExecutorArtifact({ artifactId: artifact.id, title: " New title " });

    expect(result.artifact.title).toBe("New title");
    expect(calls[1]).toEqual({
      url: "https://executor.test/api/artifacts/artifact%2F1",
      method: "PATCH",
      body: '{"title":"New title"}',
    });
  });

  test("deletes once and refuses an unconfirmed removal result", async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      return response(calls === 1 ? artifact : { removed: false });
    }) as typeof fetch;

    await expect(artifactAi.deleteExecutorArtifact({ artifactId: artifact.id })).rejects.toThrow("did not remove");
    expect(calls).toBe(2);
  });
});
