import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

import type { CardTemplateDraft } from "../domain/template";
import { TemplateRepository, TemplateRepositoryError, type TemplateStorage } from "./template-repository";

class MemoryStorage implements TemplateStorage {
  value: string | undefined;

  async getItem(): Promise<string | undefined> {
    return this.value;
  }

  async setItem(_key: string, value: string): Promise<void> {
    this.value = value;
  }
}

describe("TemplateRepository", () => {
  let storage: MemoryStorage;
  let ids: string[];
  let repository: TemplateRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    ids = ["id-1", "id-2", "id-3"];
    repository = new TemplateRepository(
      storage,
      () => ids.shift() ?? "fallback-id",
      () => new Date("2026-07-22T10:00:00.000Z")
    );
  });

  it("creates, updates, duplicates, and deletes templates", async () => {
    const created = await repository.create(draft());
    expect(created).toMatchObject({ id: "id-1", name: "Words", updatedAt: "2026-07-22T10:00:00.000Z" });

    const updated = await repository.update(created.id, draft({ name: "Updated" }));
    expect(updated.name).toBe("Updated");

    const duplicate = await repository.duplicate(created.id);
    expect(duplicate).toMatchObject({ id: "id-2", name: "Updated Copy" });
    expect(await repository.list()).toHaveLength(2);

    expect(await repository.delete(created.id)).toBe(true);
    expect(await repository.delete("missing")).toBe(false);
    expect((await repository.list()).map((template) => template.id)).toEqual(["id-2"]);
  });

  it("keeps corrupted storage unchanged", async () => {
    storage.value = "{broken";
    const original = storage.value;

    await expect(repository.list()).rejects.toBeInstanceOf(TemplateRepositoryError);
    expect(storage.value).toBe(original);
  });

  it("migrates version 1 templates without exposing deck IDs as names", async () => {
    const created = await repository.create(draft({ deckId: " [[deck-1]] " }));
    expect(created.deckId).toBe("deck-1");

    storage.value = JSON.stringify({
      version: 1,
      templates: [
        {
          ...created,
          content: created.cardBody,
          deckId: "[[legacy-deck]]",
          deckName: undefined,
          mochiTemplateId: undefined,
          fields: undefined,
          variables: [{ name: "word", label: "Word", required: true }],
        },
      ],
    });

    expect((await repository.list())[0]).toMatchObject({
      deckId: "legacy-deck",
      deckName: "Unknown deck",
      fields: [{ id: "legacy-1", name: "word", type: "text", required: true, multiline: false }],
    });
  });

  it("migrates version 2 variables to fields without labels", async () => {
    const created = await repository.create(draft());
    storage.value = JSON.stringify({
      version: 2,
      templates: [
        {
          ...created,
          content: created.cardBody,
          fields: undefined,
          mochiTemplateId: undefined,
          variables: [{ name: "word", label: "Word", required: true }],
        },
      ],
    });

    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({
        fields: [{ id: "legacy-1", name: "word", type: "text", required: true, multiline: false }],
      }),
    ]);
  });

  it("migrates version 3 templates to use no Mochi template", async () => {
    const created = await repository.create(draft());
    storage.value = JSON.stringify({
      version: 3,
      templates: [
        {
          ...created,
          content: created.cardBody,
          mochiTemplateId: undefined,
          fields: created.fields.map((field) => ({
            name: field.name,
            required: field.type === "boolean" ? false : field.required,
          })),
        },
      ],
    });

    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({
        output: { kind: "card-body", templateMode: "none" },
        fields: [{ id: "legacy-1", name: "word", type: "text", required: true, multiline: false }],
      }),
    ]);
  });

  it("migrates version 4 fields to single-line inputs", async () => {
    const created = await repository.create(
      draft({ fields: [{ id: "word", name: "word", type: "text", required: true, multiline: true }] })
    );
    storage.value = JSON.stringify({
      version: 4,
      templates: [
        {
          ...created,
          content: created.cardBody,
          fields: created.fields.map((field) => ({
            name: field.name,
            required: field.type === "boolean" ? false : field.required,
          })),
        },
      ],
    });

    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({
        fields: [{ id: "legacy-1", name: "word", type: "text", required: true, multiline: false }],
      }),
    ]);
  });

  it("migrates version 5 selected templates to needs-configuration without losing Card Body", async () => {
    const created = await repository.create(draft());
    storage.value = JSON.stringify({
      version: 5,
      templates: [
        {
          ...created,
          content: "# Saved card body",
          fields: [{ name: "word", required: true, multiline: true }],
          mochiTemplateId: "remote-template",
        },
      ],
    });

    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({
        cardBody: "# Saved card body",
        fields: [{ id: "legacy-1", name: "word", type: "text", required: true, multiline: true }],
        output: {
          kind: "mochi-template",
          target: { status: "needs-configuration", templateId: "remote-template" },
        },
      }),
    ]);
  });

  it("migrates version 6 card-body output to the explicit no-template mode", async () => {
    const created = await repository.create(draft());
    storage.value = JSON.stringify({
      version: 6,
      templates: [{ ...created, output: { kind: "card-body" } }],
    });

    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({ output: { kind: "card-body", templateMode: "none" } }),
    ]);
  });

  it("keeps the generated primary field stable through duplication", async () => {
    const created = await repository.create(draft({ fields: [], cardBody: "Static" }));
    const duplicate = await repository.duplicate(created.id);

    expect(created.fields).toEqual([
      { id: "primary-name", name: "Name", type: "text", required: true, multiline: false },
    ]);
    expect(duplicate.fields).toEqual(created.fields);
  });

  it("rejects an unsupported storage version without overwriting it", async () => {
    storage.value = JSON.stringify({ version: 8, templates: [] });

    await expect(repository.create(draft())).rejects.toMatchObject({ kind: "corrupted-data" });
    expect(JSON.parse(storage.value)).toEqual({ version: 8, templates: [] });
  });
});

function draft(overrides: Partial<CardTemplateDraft> = {}): CardTemplateDraft {
  return {
    name: "Words",
    fields: [{ id: "word", name: "word", type: "text", required: true, multiline: false }],
    cardBody: "# <<word>>",
    output: { kind: "card-body", templateMode: "none" },
    deckId: "deck-1",
    deckName: "Vocabulary",
    tags: [" vocabulary ", "vocabulary"],
    reviewReverse: false,
    archived: false,
    ...overrides,
  };
}
