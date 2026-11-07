import { afterEach, expect, spyOn, test } from "bun:test";
import { discoverModels } from "../src/discovery";

let transport: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;
afterEach(() => transport?.mockRestore());

function mockCatalog(body: unknown, status = 200) {
  transport = spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body, { status }));
  return transport;
}

test("API discovers latest chat models with their reported capabilities", async () => {
  const fetcher = mockCatalog({
    data: [
      {
        id: "new-chat-latest",
        name: "New Chat",
        max_context_length: 64000,
        capabilities: { completion_chat: true, function_calling: true, vision: true },
      },
      { id: "text-latest", capabilities: { completion_chat: true, function_calling: false, vision: false } },
      { id: "embedding-latest", capabilities: { completion_chat: false } },
      { id: "archived-latest", archived: true, capabilities: { completion_chat: true } },
      { id: "unknown-capabilities-latest" },
      null,
    ],
  });
  const models = await discoverModels(" api-key ");
  expect(models.map((model) => model.id).sort()).toEqual(["new-chat-latest", "text-latest"]);
  expect(models.find((model) => model.id === "new-chat-latest")).toMatchObject({
    title: "New Chat",
    contextWindow: 64000,
    capabilities: { tools: { supported: true }, vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] } },
  });
  expect(models.find((model) => model.id === "text-latest")?.capabilities?.vision).toBeUndefined();
  expect(fetcher.mock.calls[0][0]).toBe("https://api.mistral.ai/v1/models");
  expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer api-key");
  // Registration must not contain the fields rejected by Raycast's strict schema.
  expect(models.every((model) => !("provider" in model) && !("brand" in model))).toBe(true);
});

test("discovery returns an empty catalog without substituting fixed models", async () => {
  mockCatalog({ data: [] });
  expect(await discoverModels("key")).toEqual([]);
});

test("API shows only latest IDs and removes repeated catalog entries", async () => {
  mockCatalog({
    data: [
      { id: "mistral-large-latest", name: "Mistral Large", capabilities: { completion_chat: true } },
      { id: "mistral-large-2512", name: "Mistral Large", capabilities: { completion_chat: true } },
      { id: "custom-chat", name: "My Custom Chat", capabilities: { completion_chat: true } },
      { id: "mistral-medium-3-5", capabilities: { completion_chat: true } },
      { id: "ft:custom", capabilities: { completion_chat: true } },
      { id: "mistral-large-latest", name: "Mistral Large", capabilities: { completion_chat: true } },
    ],
  });
  const models = await discoverModels("key");
  expect(models.map(({ id, title }) => ({ id, title }))).toEqual([
    { id: "mistral-large-latest", title: "Mistral Large" },
  ]);
});

test("API excludes Codestral and Voxtral families even when chat-capable", async () => {
  mockCatalog({
    data: [
      "codestral-latest",
      "codestral-mamba-latest",
      "mistral-code-latest",
      "mistral-code-fim-latest",
      "voxtral-small-latest",
      "voxtral-mini-latest",
      "mistral-large-latest",
    ].map((id) => ({
      id,
      capabilities: { completion_chat: true },
    })),
  });
  expect((await discoverModels("key")).map((model) => model.id)).toEqual(["mistral-large-latest"]);
});

test("API cleans screenshot labels and prefers matching family IDs over same-name aliases", async () => {
  const entries = [
    { id: "magistral-medium-latest", name: "mistral-medium-latest" },
    { id: "mistral-vibe-latest", name: "mistral-medium-latest" },
    { id: "mistral-medium-latest", name: "mistral-medium-latest" },
    { id: "magistral-small-latest", name: "mistral-small-2603" },
    { id: "mistral-small-latest", name: "mistral-small-2603" },
    { id: "ministral-8b-latest", name: "ministral-8b-2512" },
    { id: "ministral-14b-latest", name: "ministral-14b-2512" },
    { id: "zai-glm-latest", name: "GLM 5.3" },
    { id: "alternate-code-latest", name: "Codestral (2508)" },
    { id: "alternate-audio-latest", name: "Voxtral Mini" },
  ].map((card) => ({ ...card, capabilities: { completion_chat: true } }));
  const fetcher = mockCatalog({ data: entries });
  const expected = [
    { id: "zai-glm-latest", title: "GLM 5.3" },
    { id: "ministral-14b-latest", title: "Ministral 14B" },
    { id: "ministral-8b-latest", title: "Ministral 8B" },
    { id: "mistral-medium-latest", title: "Mistral Medium" },
    { id: "mistral-small-latest", title: "Mistral Small" },
  ];
  expect((await discoverModels("key")).map(({ id, title }) => ({ id, title }))).toEqual(expected);
  fetcher.mockResolvedValueOnce(Response.json({ data: [...entries].reverse() }));
  expect((await discoverModels("key")).map(({ id, title }) => ({ id, title }))).toEqual(expected);
});

test("API reports authorization and catalog errors without returning server details", async () => {
  const fetcher = mockCatalog({ message: "sensitive response detail" }, 401);
  await expect(discoverModels("key")).rejects.toThrow("Mistral denied model discovery");
  fetcher.mockResolvedValueOnce(Response.json({ data: "invalid" }));
  await expect(discoverModels("key")).rejects.toThrow("invalid model catalog");
  fetcher.mockResolvedValueOnce(new Response("not JSON"));
  await expect(discoverModels("key")).rejects.toThrow("unreadable model catalog");
  fetcher.mockResolvedValueOnce(Response.json({}, { status: 429 }));
  await expect(discoverModels("key")).rejects.toThrow("HTTP 429");
});

test("API requires a key before requesting the catalog", async () => {
  const fetcher = mockCatalog({ data: [] });
  await expect(discoverModels(" ")).rejects.toThrow("API key");
  expect(fetcher).not.toHaveBeenCalled();
});

test("discovery reports connection failures without exposing transport details", async () => {
  transport = spyOn(globalThis, "fetch").mockRejectedValue(new Error("private transport details"));
  await expect(discoverModels("key")).rejects.toThrow("Could not connect to Mistral");
});

test("discovery distinguishes timeouts from connection failures", async () => {
  transport = spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("timeout", "TimeoutError"));
  await expect(discoverModels("key")).rejects.toThrow("Mistral model discovery timed out");
});

test("discovery identifies a timeout while reading the catalog body", async () => {
  transport = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new DOMException("timeout", "TimeoutError"));
        },
      }),
    ),
  );
  await expect(discoverModels("key")).rejects.toThrow("Mistral model discovery timed out");
});
