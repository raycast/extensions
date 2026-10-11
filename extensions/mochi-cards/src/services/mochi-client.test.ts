import { describe, expect, it, vi } from "vitest";

import {
  isMochiDeckNotFoundError,
  MochiClient,
  MochiError,
  type CreateMochiCardRequest,
  type FetchLike,
} from "./mochi-client";

describe("MochiClient", () => {
  it("omits the template ID when using the deck default", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "card-1" }), { status: 201, headers: { "Content-Type": "application/json" } })
      );
    const client = new MochiClient("secret-key", fetch);

    await expect(client.createCard(createRequest())).resolves.toEqual({ id: "card-1" });
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://app.mochi.cards/api/cards/");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("secret-key:").toString("base64")}`,
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      content: "# Card",
      "deck-id": "deck-1",
      "manual-tags": ["greek"],
      "review-reverse?": true,
      "archived?": false,
    });
  });

  it.each([
    ["id and name", JSON.stringify({ id: "card-1", name: "Created card" }), { id: "card-1", name: "Created card" }],
    ["a null name", JSON.stringify({ id: "card-1", name: null }), { id: "card-1", name: null }],
    ["a missing name", JSON.stringify({ id: "card-1" }), { id: "card-1" }],
    ["an empty response", "", {}],
    ["a malformed response", "not json", {}],
  ])("parses a create response with %s", async (_description, responseText, expected) => {
    const client = new MochiClient("secret-key", async () => new Response(responseText, { status: 201 }));

    await expect(client.createCard(createRequest())).resolves.toEqual(expected);
  });

  it("posts a null template ID when no template is selected", async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response("", { status: 201 }));
    const client = new MochiClient("secret-key", fetch);

    await client.createCard(createRequest({ output: { kind: "card-body", content: "# Card", templateMode: "none" } }));

    const [, init] = fetch.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({ "template-id": null });
  });

  it("posts the selected Mochi template ID", async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response("", { status: 201 }));
    const client = new MochiClient("secret-key", fetch);

    await client.createCard(
      createRequest({
        output: {
          kind: "mochi-template",
          templateId: "mochi-template-1",
          fields: { front: "Hello", active: true },
        },
      })
    );

    const [, init] = fetch.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      content: "",
      "template-id": "mochi-template-1",
      fields: {
        front: { id: "front", value: "Hello" },
        active: { id: "active", value: true },
      },
    });
  });

  it("deletes a card", async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response("", { status: 200 }));
    const client = new MochiClient("secret-key", fetch);

    await client.deleteCard("card-1");

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://app.mochi.cards/api/cards/card-1");
    expect(init?.method).toBe("DELETE");
    expect(init?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("secret-key:").toString("base64")}`,
    });
    expect(init?.body).toBeUndefined();
  });

  it("treats an already deleted card as deleted", async () => {
    const client = new MochiClient("secret-key", async () => new Response("Not found", { status: 404 }));

    await expect(client.deleteCard("card-1")).resolves.toBeUndefined();
  });

  it("updates only Mochi template content and fields", async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response("", { status: 200 }));
    const client = new MochiClient("secret-key", fetch);

    await client.updateCard("card/1", {
      templateId: "template-2",
      fields: { front: "Hello", active: true },
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://app.mochi.cards/api/cards/card%2F1");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("secret-key:").toString("base64")}`,
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      content: "",
      "template-id": "template-2",
      fields: {
        front: { id: "front", value: "Hello" },
        active: { id: "active", value: true },
      },
    });
  });

  it("loads a card", async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "card-1",
          "deck-id": "deck-1",
          content: "# Updated card",
          name: "Updated card",
        })
      )
    );
    const client = new MochiClient("secret-key", fetch);

    await expect(client.getCard("card-1")).resolves.toMatchObject({
      id: "card-1",
      deckId: "deck-1",
      content: "# Updated card",
      name: "Updated card",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://app.mochi.cards/api/cards/card-1",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("distinguishes authentication and validation failures", async () => {
    const unauthorized = new MochiClient("bad", async () => new Response("", { status: 401 }));
    const invalid = new MochiClient(
      "key",
      async () => new Response(JSON.stringify({ message: "deck-id is invalid" }), { status: 422 })
    );

    await expect(unauthorized.createCard(createRequest())).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(invalid.createCard(createRequest())).rejects.toMatchObject({
      kind: "validation",
      message: "deck-id is invalid",
    });
  });

  it("recognizes missing deck errors", () => {
    expect(isMochiDeckNotFoundError(new MochiError("http", "Not found", 404))).toBe(true);
    expect(isMochiDeckNotFoundError(new MochiError("validation", "deck-id is invalid", 422))).toBe(true);
    expect(isMochiDeckNotFoundError(new MochiError("network", "offline"))).toBe(false);
  });

  it("recognizes a missing deck response while listing cards", async () => {
    const client = new MochiClient(
      "key",
      async () => new Response(JSON.stringify({ errors: { "deck-id": "deck was not found" } }), { status: 422 })
    );
    let caughtError: unknown;

    try {
      await client.listCards("deleted-deck");
    } catch (error: unknown) {
      caughtError = error;
    }

    expect(caughtError).toMatchObject({ message: "deck-id: deck was not found" });
    expect(isMochiDeckNotFoundError(caughtError)).toBe(true);
  });

  it("loads every page of decks, including parent relationships, and sorts them", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ bookmark: "next-page", docs: [{ id: "deck-2", name: "Words", "parent-id": "[[deck-1]]" }] })
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ bookmark: "next-page", docs: [{ id: "deck-1", name: "Greek" }] }))
      );
    const client = new MochiClient("key", fetch);

    await expect(client.listDecks()).resolves.toEqual([
      { id: "deck-1", name: "Greek" },
      { id: "deck-2", name: "Words", parentId: "deck-1" },
    ]);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://app.mochi.cards/api/decks",
      expect.objectContaining({ method: "GET" })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://app.mochi.cards/api/decks?bookmark=next-page",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("loads every page of cards for a deck", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            bookmark: "next-page",
            docs: [
              {
                id: "card-1",
                "deck-id": "deck-1",
                content: "# Hello",
                name: "Hello",
                tags: ["greeting"],
                fields: { front: { id: "front", value: "Hello" } },
                "created-at": { date: "2026-07-21T10:00:00.000Z" },
                pos: "A",
                reviews: [{ date: { date: "2026-07-22T00:00:00.000Z" } }],
                "component-cache": {
                  ai: {
                    "Explain hello.": { text: "Hello explanation", date: "2026-07-23" },
                  },
                },
              },
            ],
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            docs: [
              {
                id: "card-2",
                "deck-id": "deck-1",
                content: "# World",
                name: null,
                "archived?": true,
                "template-id": "template-1",
              },
            ],
          })
        )
      );
    const client = new MochiClient("key", fetch);

    await expect(client.listCards("[[deck-1]]")).resolves.toEqual([
      {
        id: "card-1",
        deckId: "deck-1",
        content: "# Hello",
        name: "Hello",
        tags: ["greeting"],
        fields: [{ id: "front", value: "Hello" }],
        createdAt: "2026-07-21T10:00:00.000Z",
        updatedAt: undefined,
        position: "A",
        reviews: [{ date: "2026-07-22T00:00:00.000Z" }],
        aiCacheEntries: [{ prompt: "Explain hello.", text: "Hello explanation", date: "2026-07-23" }],
        archived: undefined,
        templateId: undefined,
      },
      {
        id: "card-2",
        deckId: "deck-1",
        content: "# World",
        name: null,
        tags: [],
        fields: [],
        createdAt: undefined,
        updatedAt: undefined,
        position: undefined,
        reviews: [],
        aiCacheEntries: [],
        archived: true,
        templateId: "template-1",
      },
    ]);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://app.mochi.cards/api/cards/?deck-id=deck-1&limit=100",
      expect.objectContaining({ method: "GET" })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://app.mochi.cards/api/cards/?deck-id=deck-1&limit=100&bookmark=next-page",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("stops pagination at Mochi's nil bookmark", async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(
      new Response(
        JSON.stringify({
          docs: [],
          bookmark: "nil",
        })
      )
    );
    const client = new MochiClient("key", fetch);

    await expect(client.listCards("deck-1")).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("loads every page of templates and sorts them", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            bookmark: "next-page",
            docs: [
              {
                id: "template-2",
                name: "Words",
                content: "# << Word >>",
                fields: { word: { id: "word" } },
              },
            ],
          })
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ docs: [{ id: "template-1", name: "Greek" }] })));
    const client = new MochiClient("key", fetch);

    await expect(client.listTemplates()).resolves.toEqual([
      { id: "template-1", name: "Greek", content: undefined, fields: [] },
      {
        id: "template-2",
        name: "Words",
        content: "# << Word >>",
        fields: [{ id: "word", name: "word", type: "text", multiline: false }],
      },
    ]);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://app.mochi.cards/api/templates/",
      expect.objectContaining({ method: "GET" })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://app.mochi.cards/api/templates/?bookmark=next-page",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("loads one template with raw field types, multiline options, and lexical positions", async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "template-1",
          name: "Typed",
          fields: {
            boolean: {
              id: "boolean",
              name: "Enabled",
              type: "boolean",
              pos: "B",
              options: { "multi-line?": true },
            },
            unknown: { id: "unknown", name: "Future", type: "future", pos: "C" },
            text: { id: "text", name: "Text", pos: "A" },
          },
        })
      )
    );
    const client = new MochiClient("key", fetch);

    await expect(client.getTemplate("template-1")).resolves.toMatchObject({
      fields: [
        { id: "text", type: "text", pos: "A", multiline: false },
        { id: "boolean", type: "boolean", pos: "B", multiline: true },
        { id: "unknown", type: "future", pos: "C", multiline: false },
      ],
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://app.mochi.cards/api/templates/template-1",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("parses boolean card field values", async () => {
    const client = new MochiClient(
      "key",
      async () =>
        new Response(
          JSON.stringify({
            id: "card",
            "deck-id": "deck",
            content: "",
            fields: { active: { id: "active", value: true } },
          })
        )
    );

    await expect(client.getCard("card")).resolves.toMatchObject({ fields: [{ id: "active", value: true }] });
  });

  it("parses numeric card field values", async () => {
    const client = new MochiClient(
      "key",
      async () =>
        new Response(
          JSON.stringify({
            id: "card",
            "deck-id": "deck",
            content: "",
            fields: { count: { id: "count", value: 123 } },
          })
        )
    );

    await expect(client.getCard("card")).resolves.toMatchObject({ fields: [{ id: "count", value: "123" }] });
  });

  it("rejects invalid deck responses", async () => {
    const client = new MochiClient("key", async () => new Response(JSON.stringify({ docs: "invalid" })));

    await expect(client.listDecks()).rejects.toMatchObject({
      kind: "http",
      message: "Mochi returned an invalid deck list",
    });
  });

  it("excludes trashed cards", async () => {
    const client = new MochiClient(
      "key",
      async () =>
        new Response(
          JSON.stringify({
            docs: [
              { id: "active-card", "deck-id": "deck-1", content: "# Active" },
              {
                id: "trashed-card",
                "deck-id": "deck-1",
                content: "# Trashed",
                "trashed?": { date: "2026-07-18T20:11:14.657Z" },
              },
            ],
          })
        )
    );

    await expect(client.listCards("deck-1")).resolves.toEqual([expect.objectContaining({ id: "active-card" })]);
  });

  it("rejects invalid card responses", async () => {
    const client = new MochiClient("key", async () => new Response(JSON.stringify({ docs: "invalid" })));

    await expect(client.listCards("deck-1")).rejects.toMatchObject({
      kind: "http",
      message: "Mochi returned an invalid card list",
    });
  });

  it("wraps network errors", async () => {
    const client = new MochiClient("key", async () => {
      throw new Error("offline");
    });

    await expect(client.createCard(createRequest())).rejects.toMatchObject({ kind: "network", message: "offline" });
  });
});

function createRequest(overrides: Partial<CreateMochiCardRequest> = {}): CreateMochiCardRequest {
  return {
    deckId: "[[deck-1]]",
    tags: ["greek"],
    reviewReverse: true,
    archived: false,
    output: { kind: "card-body", content: "# Card", templateMode: "deck-default" },
    ...overrides,
  };
}
