import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ConversationStore,
  appendTurn,
  branchFromTurn,
  createConversation,
  deleteTurnFromActiveBranch,
  editTurn,
  getActiveBranch,
  getPreviousResponseId,
  regenerateAssistantTurn,
  serializeConversationMarkdown,
  updateGenerationSettings,
} from "../src/lib/conversations";

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lm-studio-raycast-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("conversation branches", () => {
  it("keeps old descendants when editing and selects the new branch", () => {
    let conversation = createConversation({ settings: { model: "qwen" } });
    conversation = appendTurn(conversation, {
      id: "user_1",
      role: "user",
      content: "Original question",
    });
    conversation = appendTurn(conversation, {
      id: "assistant_1",
      role: "assistant",
      content: "Original answer",
      responseId: "resp_original",
    });

    const edited = editTurn(conversation, "user_1", {
      content: "Edited question",
    });
    const active = getActiveBranch(edited);

    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      role: "user",
      content: "Edited question",
      parentId: null,
    });
    expect(edited.turns).toHaveLength(3);
    expect(edited.turns.find((turn) => turn.id === "assistant_1")?.content).toBe("Original answer");
  });

  it("supports regeneration, deletion, and selecting a prior branch", () => {
    let conversation = createConversation({ settings: { model: "qwen" } });
    conversation = appendTurn(conversation, {
      id: "u",
      role: "user",
      content: "Question",
    });
    conversation = appendTurn(conversation, {
      id: "a",
      role: "assistant",
      content: "Answer",
    });
    const regenerated = regenerateAssistantTurn(conversation, "a");
    expect(getActiveBranch(regenerated).at(-1)).toMatchObject({
      role: "assistant",
      content: "",
      status: "pending",
      parentId: "u",
    });

    const deleted = deleteTurnFromActiveBranch(conversation, "a");
    expect(deleted.activeLeafId).toBe("u");
    expect(getActiveBranch(branchFromTurn(deleted, "a"))).toHaveLength(2);
  });

  it("resets stateful response continuity after model or system changes", () => {
    let conversation = createConversation({ settings: { model: "qwen" } });
    conversation = appendTurn(conversation, {
      role: "assistant",
      content: "Answer",
      responseId: "resp_1",
    });
    expect(getPreviousResponseId(conversation)).toBe("resp_1");

    const displayOnly = updateGenerationSettings(conversation, {
      showReasoning: true,
    });
    expect(displayOnly.chainVersion).toBe(0);
    expect(getPreviousResponseId(displayOnly)).toBe("resp_1");

    const changedModel = updateGenerationSettings(conversation, {
      model: "gemma",
    });
    expect(changedModel.chainVersion).toBe(1);
    expect(getPreviousResponseId(changedModel)).toBeUndefined();
  });
});

describe("ConversationStore", () => {
  it("persists, lists, exports, and recovers from the atomic backup", async () => {
    const supportPath = await temporaryDirectory();
    const store = new ConversationStore(supportPath);
    let conversation = await store.create({
      title: "Local test",
      settings: { model: "qwen" },
    });
    conversation = appendTurn(conversation, {
      role: "user",
      content: "Hello",
    });
    conversation = await store.save(conversation);

    expect(await store.get(conversation.id)).toMatchObject({
      title: "Local test",
    });
    expect(await store.list()).toMatchObject([{ id: conversation.id, turnCount: 1, preview: "Hello" }]);
    const exported = await store.exportConversation(conversation.id, "markdown");
    expect(await readFile(exported, "utf8")).toContain("## You\n\nHello");

    const primary = path.join(supportPath, "conversations", `${conversation.id}.json`);
    await writeFile(primary, "not-json");
    const recovered = await store.get(conversation.id);
    expect(recovered?.title).toBe("Local test");
  });

  it("migrates a pre-versioned sequential transcript", async () => {
    const supportPath = await temporaryDirectory();
    const store = new ConversationStore(supportPath);
    const legacy = {
      id: "legacy",
      title: "Legacy",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      settings: { model: "qwen" },
      turns: [
        {
          id: "one",
          role: "user",
          content: "Hello",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "two",
          role: "assistant",
          content: "Hi",
          createdAt: "2026-01-01T00:00:01.000Z",
        },
      ],
    };
    // The first store operation creates all support directories.
    await store.list();
    await writeFile(path.join(store.conversationsPath, "legacy.json"), JSON.stringify(legacy));

    const migrated = await store.get("legacy");
    expect(migrated).toMatchObject({
      activeLeafId: "two",
      chainVersion: 0,
      settings: { temperature: 0.7, maxOutputTokens: 2048 },
    });
    expect(getActiveBranch(migrated!)).toMatchObject([
      { id: "one", parentId: null, status: "completed" },
      { id: "two", parentId: "one", status: "completed" },
    ]);
  });

  it("copies only supported image content and creates data URLs", async () => {
    const supportPath = await temporaryDirectory();
    const sourcePath = path.join(supportPath, "tiny.png");
    await writeFile(sourcePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const store = new ConversationStore(supportPath);
    const [attachment] = await store.copyAttachments("conversation", [sourcePath]);
    expect(attachment).toMatchObject({ mimeType: "image/png", sizeBytes: 8 });
    await expect(store.attachmentDataUrl(attachment)).resolves.toMatch(/^data:image\/png;base64,/);
  });
});

describe("conversation export", () => {
  it("hides reasoning by default", () => {
    let conversation = createConversation({ settings: { model: "qwen" } });
    conversation = appendTurn(conversation, {
      role: "assistant",
      content: "Answer",
      reasoning: "Private chain of thought",
    });
    expect(serializeConversationMarkdown(conversation)).not.toContain("Private chain of thought");
    expect(serializeConversationMarkdown(conversation, { includeReasoning: true })).toContain(
      "Private chain of thought",
    );
  });
});
