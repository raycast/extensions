# File and Image Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attach images (sent to vision models as multimodal content parts) and text files (content injected into the prompt) to chat messages.

**Architecture:** New pure modules `src/lib/attachments.ts` (classification/limits) and `src/lib/payload.ts` (API message builder) keep all attachment logic testable outside the UI. `Message` gains an optional `attachments` field (images stored as paths only; text content frozen at attach time). `useLoadedModels` switches to the native `/api/v1/models` endpoint to expose per-model `capabilities.vision`. ChatView adds Finder/clipboard attach actions with a pending-attachments draft.

**Tech Stack:** Raycast API (List, getSelectedFinderItems, Clipboard.read), LM Studio OpenAI-compat multimodal (`image_url` + base64 data URI), node:fs/promises, vitest.

**Spec:** `docs/superpowers/specs/2026-07-07-attachments-design.md`

## Global Constraints

- Limits (verbatim from spec): max **5** attachments per message; image ≤ **10 MB**; text ≤ **200 KB**.
- Image extensions: `png jpg jpeg webp gif`. Text extensions: `md txt json ts tsx js jsx py rb go rs swift kt java c cpp h css html xml yml yaml toml csv log sh`. Other files: accepted as text only if UTF-8 with no null bytes.
- Image base64 is NEVER written to LocalStorage; text attachment content is frozen into `Attachment.content` at attach time.
- Do not change `src/models.tsx`, `src/lib/storage.ts`, or `src/history.tsx` behavior.
- All commits on branch `feat/attachments`. After each task: `npm run build`, `npm run lint` (run `npm run fix-lint` on Prettier failures, then re-verify), `npx vitest run` — all must pass (only the pre-existing package.json title-case warning is acceptable).
- Tests must not require a running LM Studio server (Task 7's live check is the only exception).

---

### Task 1: Attachment types and classification module

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/attachments.ts`
- Test: `tests/attachments.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Attachment { type: "image" | "text"; path: string; name: string; content?: string }`; `Message.attachments?: Attachment[]`; `ModelInfo` gains `kind: string; vision: boolean`; `classifyPath(path): Promise<ClassifyResult>`; `mimeForImage(path): string`; constants `MAX_ATTACHMENTS_PER_MESSAGE`, `MAX_IMAGE_BYTES`, `MAX_TEXT_BYTES`.

- [ ] **Step 1: Update `src/lib/types.ts`** (replace entire file)

```ts
export interface Attachment {
  type: "image" | "text";
  path: string; // absolute path
  name: string; // basename, for display
  content?: string; // only for type === "text": frozen at attach time
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  attachments?: Attachment[]; // only on user messages
}

export interface Chat {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ModelInfo {
  id: string;
  loaded: boolean;
  instanceIds: string[];
  kind: string; // native `type` field: "llm" | "embedding" | ...
  vision: boolean; // capabilities.vision
}
```

- [ ] **Step 2: Write the failing tests** — create `tests/attachments.test.ts`

```ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  MAX_TEXT_BYTES,
  classifyPath,
  mimeForImage,
} from "../src/lib/attachments";

// 1x1 transparent PNG
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "lmstudio-attach-"));
  await writeFile(join(dir, "shot.png"), TINY_PNG);
  await writeFile(join(dir, "notes.md"), "# hello\nworld");
  await writeFile(join(dir, "data.bin"), Buffer.from([0x00, 0x01, 0x02]));
  await writeFile(join(dir, "big.txt"), "x".repeat(MAX_TEXT_BYTES + 1));
});

describe("classifyPath", () => {
  it("classifies png as image without reading content", async () => {
    const r = await classifyPath(join(dir, "shot.png"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.attachment).toEqual({
        type: "image",
        path: join(dir, "shot.png"),
        name: "shot.png",
      });
    }
  });

  it("classifies md as text and freezes content", async () => {
    const r = await classifyPath(join(dir, "notes.md"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.attachment.type).toBe("text");
      expect(r.attachment.content).toBe("# hello\nworld");
      expect(r.attachment.name).toBe("notes.md");
    }
  });

  it("rejects binary files with unknown extension", async () => {
    const r = await classifyPath(join(dir, "data.bin"));
    expect(r.ok).toBe(false);
  });

  it("rejects oversized text files", async () => {
    const r = await classifyPath(join(dir, "big.txt"));
    expect(r.ok).toBe(false);
  });

  it("rejects missing files", async () => {
    const r = await classifyPath(join(dir, "nope.txt"));
    expect(r.ok).toBe(false);
  });
});

describe("mimeForImage", () => {
  it("maps extensions to mime types", () => {
    expect(mimeForImage("/a/b.png")).toBe("image/png");
    expect(mimeForImage("/a/b.JPG")).toBe("image/jpeg");
    expect(mimeForImage("/a/b.webp")).toBe("image/webp");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/attachments.test.ts`
Expected: FAIL — cannot resolve `../src/lib/attachments`.

- [ ] **Step 4: Create `src/lib/attachments.ts`**

```ts
import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { Attachment } from "./types";

export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT_BYTES = 200 * 1024;

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const TEXT_EXTENSIONS = new Set([
  "md", "txt", "json", "ts", "tsx", "js", "jsx", "py", "rb", "go", "rs",
  "swift", "kt", "java", "c", "cpp", "h", "css", "html", "xml", "yml",
  "yaml", "toml", "csv", "log", "sh",
]);

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function ext(path: string): string {
  return extname(path).slice(1).toLowerCase();
}

export function mimeForImage(path: string): string {
  return IMAGE_MIME[ext(path)] ?? "image/png";
}

export type ClassifyResult =
  | { ok: true; attachment: Attachment }
  | { ok: false; reason: string };

/**
 * Classify a filesystem path as an image or text attachment, enforcing the
 * spec's size limits. Text content is frozen here so later edits/deletion of
 * the file do not change the conversation context.
 */
export async function classifyPath(path: string): Promise<ClassifyResult> {
  const name = basename(path);
  let size: number;
  try {
    const s = await stat(path);
    if (!s.isFile()) return { ok: false, reason: `${name}: not a file` };
    size = s.size;
  } catch {
    return { ok: false, reason: `${name}: cannot read file` };
  }

  if (IMAGE_EXTENSIONS.has(ext(path))) {
    if (size > MAX_IMAGE_BYTES) {
      return { ok: false, reason: `${name}: image larger than 10 MB` };
    }
    return { ok: true, attachment: { type: "image", path, name } };
  }

  if (size > MAX_TEXT_BYTES) {
    return { ok: false, reason: `${name}: text file larger than 200 KB` };
  }
  const buffer = await readFile(path);
  if (!TEXT_EXTENSIONS.has(ext(path)) && buffer.includes(0)) {
    return { ok: false, reason: `${name}: unsupported file type` };
  }
  return {
    ok: true,
    attachment: { type: "text", path, name, content: buffer.toString("utf-8") },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/attachments.test.ts`
Expected: 6 tests PASS. Then `npx vitest run` — all suites pass (34 existing + 6 new).

- [ ] **Step 6: Verify build/lint and commit**

Run: `npm run build && npm run lint` (fix-lint if needed).

```bash
git add src/lib/types.ts src/lib/attachments.ts tests/attachments.test.ts
git commit -m "feat: attachment types and classification module"
```

---

### Task 2: API payload builder

**Files:**
- Create: `src/lib/payload.ts`
- Test: `tests/payload.test.ts`

**Interfaces:**
- Consumes: `Chat`, `Message`, `Attachment` from `src/lib/types.ts`; `mimeForImage` from `src/lib/attachments.ts` (Task 1).
- Produces: `ContentPart`, `ApiMessage { role: "system" | "user" | "assistant"; content: string | ContentPart[] }`, `textWithFileBlocks(message): string`, `buildApiMessages(chat, options): Promise<{ messages: ApiMessage[]; skippedImages: string[] }>` — Tasks 3 and 5 rely on these exact names.

- [ ] **Step 1: Write the failing tests** — create `tests/payload.test.ts`

```ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildApiMessages, textWithFileBlocks } from "../src/lib/payload";
import { Chat, Message } from "../src/lib/types";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

let dir: string;

function chatWith(messages: Message[]): Chat {
  return {
    id: "c1",
    title: "t",
    model: "m",
    messages,
    createdAt: 0,
    updatedAt: 0,
  };
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "lmstudio-payload-"));
  await writeFile(join(dir, "shot.png"), TINY_PNG);
});

describe("textWithFileBlocks", () => {
  it("returns plain content when no attachments", () => {
    const m: Message = { role: "user", content: "hi", timestamp: 0 };
    expect(textWithFileBlocks(m)).toBe("hi");
  });

  it("appends frozen text attachments as blocks", () => {
    const m: Message = {
      role: "user",
      content: "summarize",
      timestamp: 0,
      attachments: [
        { type: "text", path: "/x/notes.md", name: "notes.md", content: "# hello" },
      ],
    };
    expect(textWithFileBlocks(m)).toBe(
      "summarize\n\n--- attached file: notes.md ---\n# hello",
    );
  });
});

describe("buildApiMessages", () => {
  it("prepends system prompt and passes plain messages through", async () => {
    const { messages, skippedImages } = await buildApiMessages(
      chatWith([
        { role: "user", content: "q", timestamp: 0 },
        { role: "assistant", content: "a", timestamp: 0 },
      ]),
      { systemPrompt: "sys", includeImages: true },
    );
    expect(messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "q" },
      { role: "assistant", content: "a" },
    ]);
    expect(skippedImages).toEqual([]);
  });

  it("builds image content parts with base64 data URI", async () => {
    const { messages, skippedImages } = await buildApiMessages(
      chatWith([
        {
          role: "user",
          content: "what is this?",
          timestamp: 0,
          attachments: [{ type: "image", path: join(dir, "shot.png"), name: "shot.png" }],
        },
      ]),
      { includeImages: true },
    );
    expect(skippedImages).toEqual([]);
    const content = messages[0].content;
    expect(Array.isArray(content)).toBe(true);
    if (Array.isArray(content)) {
      expect(content[0]).toEqual({ type: "text", text: "what is this?" });
      expect(content[1]).toEqual({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${TINY_PNG.toString("base64")}`,
        },
      });
    }
  });

  it("skips images when includeImages is false", async () => {
    const { messages } = await buildApiMessages(
      chatWith([
        {
          role: "user",
          content: "q",
          timestamp: 0,
          attachments: [{ type: "image", path: join(dir, "shot.png"), name: "shot.png" }],
        },
      ]),
      { includeImages: false },
    );
    expect(messages[0].content).toBe("q");
  });

  it("reports missing image files in skippedImages and degrades to text", async () => {
    const { messages, skippedImages } = await buildApiMessages(
      chatWith([
        {
          role: "user",
          content: "q",
          timestamp: 0,
          attachments: [{ type: "image", path: join(dir, "gone.png"), name: "gone.png" }],
        },
      ]),
      { includeImages: true },
    );
    expect(skippedImages).toEqual(["gone.png"]);
    expect(messages[0].content).toBe("q");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/payload.test.ts`
Expected: FAIL — cannot resolve `../src/lib/payload`.

- [ ] **Step 3: Create `src/lib/payload.ts`**

```ts
import { readFile } from "node:fs/promises";
import { mimeForImage } from "./attachments";
import { Chat, Message } from "./types";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ApiMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

/** User message text expanded with its frozen text-file attachment blocks. */
export function textWithFileBlocks(message: Message): string {
  const files = (message.attachments ?? []).filter((a) => a.type === "text");
  return files.reduce(
    (text, a) => `${text}\n\n--- attached file: ${a.name} ---\n${a.content ?? ""}`,
    message.content,
  );
}

/**
 * Build the OpenAI-compatible message array for a chat. Images are re-read
 * from disk on every request (base64 is never persisted); missing files are
 * skipped and reported via skippedImages. With includeImages=false (model
 * has no vision) image parts are omitted so the request degrades to text.
 */
export async function buildApiMessages(
  chat: Chat,
  options: { systemPrompt?: string; includeImages: boolean },
): Promise<{ messages: ApiMessage[]; skippedImages: string[] }> {
  const skippedImages: string[] = [];
  const messages: ApiMessage[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  for (const m of chat.messages) {
    const text = m.role === "user" ? textWithFileBlocks(m) : m.content;
    const images =
      options.includeImages && m.role === "user"
        ? (m.attachments ?? []).filter((a) => a.type === "image")
        : [];
    const parts: ContentPart[] = [{ type: "text", text }];
    for (const image of images) {
      try {
        const data = await readFile(image.path);
        parts.push({
          type: "image_url",
          image_url: {
            url: `data:${mimeForImage(image.path)};base64,${data.toString("base64")}`,
          },
        });
      } catch {
        skippedImages.push(image.name);
      }
    }
    messages.push(
      parts.length === 1
        ? { role: m.role, content: text }
        : { role: m.role, content: parts },
    );
  }
  return { messages, skippedImages };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/payload.test.ts` → 6 PASS. Then `npx vitest run` → all pass.

- [ ] **Step 5: Verify build/lint and commit**

Run: `npm run build && npm run lint` (fix-lint if needed).

```bash
git add src/lib/payload.ts tests/payload.test.ts
git commit -m "feat: multimodal API payload builder"
```

---

### Task 3: Vision-aware model listing and multimodal chatStream

**Files:**
- Modify: `src/lib/lmstudio.ts`
- Modify: `src/hooks/useModels.ts`
- Test: `tests/lmstudio.test.ts` (add cases)

**Interfaces:**
- Consumes: `ApiMessage` from `src/lib/payload.ts` (Task 2); `ModelInfo.kind/vision` (Task 1).
- Produces: `chatStream` accepts `messages: ApiMessage[]`; `listAllModels` fills `kind` and `vision`; `useLoadedModels()` returns `{ models: ChatModel[] | undefined, ... }` with `ChatModel { id: string; vision: boolean }` — Task 6's ChatView relies on this shape.

- [ ] **Step 1: Add failing tests** — append to `tests/lmstudio.test.ts` inside the existing `describe` structure (reuse the file's existing `vi.mock("@raycast/api", ...)` setup and fetch-mock helpers; follow the file's current patterns for mocking `fetch` responses):

```ts
describe("listAllModels vision parsing", () => {
  it("parses kind and vision from native entries", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          models: [
            {
              key: "google/gemma-4-e4b",
              type: "llm",
              loaded_instances: [{ id: "google/gemma-4-e4b" }],
              capabilities: { vision: true, trained_for_tool_use: true },
            },
            {
              key: "text-embedding-nomic-embed-text-v1.5",
              type: "embedding",
              loaded_instances: [],
            },
          ],
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const models = await listAllModels({ baseUrl: "http://x" });
    expect(models).toEqual([
      {
        id: "google/gemma-4-e4b",
        loaded: true,
        instanceIds: ["google/gemma-4-e4b"],
        kind: "llm",
        vision: true,
      },
      {
        id: "text-embedding-nomic-embed-text-v1.5",
        loaded: false,
        instanceIds: [],
        kind: "embedding",
        vision: false,
      },
    ]);
  });
});
```

(If the file's existing tests mock `fetch` differently — e.g. via a helper — match that style instead of the raw `Response` above. The assertion content must stay the same.)

- [ ] **Step 2: Run tests to verify the new case fails**

Run: `npx vitest run tests/lmstudio.test.ts`
Expected: the new test FAILS (missing `kind`/`vision` in the result objects).

- [ ] **Step 3: Update `src/lib/lmstudio.ts`**

(a) Extend `NativeModelEntry` and the mapping in `listAllModels`:

```ts
interface NativeModelEntry {
  id?: string;
  key?: string;
  type?: string;
  loaded_instances?: { id: string }[];
  capabilities?: { vision?: boolean };
}
```

```ts
  return entries
    .map((e) => {
      const instanceIds = (e.loaded_instances ?? []).map((inst) => inst.id);
      return {
        id: e.key ?? e.id ?? "",
        loaded: instanceIds.length > 0,
        instanceIds,
        kind: e.type ?? "llm",
        vision: e.capabilities?.vision ?? false,
      };
    })
    .filter((m) => m.id !== "");
```

(b) Widen `chatStream` to multimodal messages — add the import and change only the `messages` param type (body/stream logic unchanged):

```ts
import { ApiMessage } from "./payload";
```

```ts
export async function* chatStream(
  config: LMStudioConfig,
  params: {
    model: string;
    messages: ApiMessage[];
    temperature: number;
    signal?: AbortSignal;
  },
): AsyncGenerator<string> {
```

- [ ] **Step 4: Replace `src/hooks/useModels.ts`** (entire file)

```ts
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { getConfig, listAllModels } from "../lib/lmstudio";

const REFRESH_INTERVAL_MS = 10_000;

export interface ChatModel {
  id: string;
  vision: boolean;
}

/**
 * Chat-capable models on the LM Studio server (embeddings excluded), fetched
 * fresh from the native API (which exposes capabilities.vision) and
 * re-fetched on an interval so removed/added models show up promptly.
 * Loaded models sort first; unloaded ones still work via JIT loading.
 */
export function useLoadedModels() {
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const all = await listAllModels(getConfig());
    return all
      .filter((m) => m.kind !== "embedding")
      .sort((a, b) => Number(b.loaded) - Number(a.loaded))
      .map((m): ChatModel => ({ id: m.id, vision: m.vision }));
  }, []);

  useEffect(() => {
    const timer = setInterval(revalidate, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  return { models: data, isLoading, error, revalidate };
}
```

Note: `src/views/ChatView.tsx` still treats `models` as `string[]` at this point and will fail `npm run build` type-checking. That is expected mid-task; Task 6 fixes ChatView. To keep this task independently verifiable, apply this **temporary minimal bridge** in `ChatView.tsx` — change ONLY these expressions (Task 6 replaces the file wholesale):
- `models?.includes(chat.model)` → `models?.some((m) => m.id === chat.model)`
- `models?.includes(preferredModel)` → `models?.some((m) => m.id === preferredModel)`
- `models?.[0]` → `models?.[0]?.id`
- `{(models ?? []).map((m) => (<List.Dropdown.Item key={m} title={m} value={m} />))}` → `{(models ?? []).map((m) => (<List.Dropdown.Item key={m.id} title={m.id} value={m.id} />))}`

- [ ] **Step 5: Verify**

Run: `npx vitest run` → all pass (new lmstudio case green). `npm run build` → exit 0. `npm run lint` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/lmstudio.ts src/hooks/useModels.ts src/views/ChatView.tsx tests/lmstudio.test.ts
git commit -m "feat: vision-aware model listing and multimodal chat stream"
```

---

### Task 4: Transcript rendering for attachments

**Files:**
- Modify: `src/lib/transcript.ts`
- Test: `tests/transcript.test.ts` (add cases)

**Interfaces:**
- Consumes: `Message.attachments` (Task 1).
- Produces: `turnMarkdown` renders attachments under the question; `hasAttachments(turn): boolean` — Task 6's ChatView uses it for the paperclip accessory.

- [ ] **Step 1: Add failing tests** — append to `tests/transcript.test.ts` (the file already mocks `@raycast/api`; reuse its existing `msg`/`chat` helpers if present, otherwise construct Message objects inline):

```ts
describe("attachments", () => {
  it("renders image attachments as file:// markdown images", () => {
    const turn = {
      question: {
        role: "user" as const,
        content: "what is this?",
        timestamp: 0,
        attachments: [
          { type: "image" as const, path: "/tmp/my shot.png", name: "my shot.png" },
        ],
      },
      answer: { role: "assistant" as const, content: "a cat", timestamp: 1 },
      userIndex: 0,
    };
    const md = turnMarkdown(turn, "m");
    expect(md).toContain("![my shot.png](file:///tmp/my%20shot.png)");
    expect(md.indexOf("![my shot.png]")).toBeLessThan(md.indexOf("---"));
  });

  it("renders text attachments as paperclip lines without content", () => {
    const turn = {
      question: {
        role: "user" as const,
        content: "summarize",
        timestamp: 0,
        attachments: [
          { type: "text" as const, path: "/x/notes.md", name: "notes.md", content: "secret" },
        ],
      },
      userIndex: 0,
    };
    const md = turnMarkdown(turn, "m");
    expect(md).toContain("📎 notes.md");
    expect(md).not.toContain("secret");
  });

  it("hasAttachments reflects question attachments", () => {
    const bare = {
      question: { role: "user" as const, content: "q", timestamp: 0 },
      userIndex: 0,
    };
    expect(hasAttachments(bare)).toBe(false);
  });
});
```

(Import `hasAttachments` alongside the existing `turnMarkdown` import.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/transcript.test.ts`
Expected: FAIL — `hasAttachments` not exported; markdown missing attachment lines.

- [ ] **Step 3: Update `src/lib/transcript.ts`** — add helper and extend `turnMarkdown` (rest of file unchanged):

```ts
function attachmentsMarkdown(message: Message): string {
  const attachments = message.attachments ?? [];
  if (attachments.length === 0) return "";
  const lines = attachments.map((a) =>
    a.type === "image"
      ? `![${a.name}](file://${encodeURI(a.path)})`
      : `📎 ${a.name}`,
  );
  return `\n\n${lines.join("\n\n")}`;
}

export function hasAttachments(turn: Turn): boolean {
  return (turn.question.attachments ?? []).length > 0;
}

export function turnMarkdown(turn: Turn, model: string): string {
  return (
    `**🧑 You**\n\n${turn.question.content}${attachmentsMarkdown(turn.question)}\n\n` +
    `---\n\n` +
    `**🤖 ${model}**\n\n${turn.answer?.content || "…"}`
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run` → all pass.

- [ ] **Step 5: Verify build/lint and commit**

```bash
git add src/lib/transcript.ts tests/transcript.test.ts
git commit -m "feat: render attachments in turn markdown"
```

---

### Task 5: sendMessage with attachments

**Files:**
- Modify: `src/hooks/useChat.ts`

**Interfaces:**
- Consumes: `buildApiMessages` (Task 2), `Attachment` (Task 1), widened `chatStream` (Task 3).
- Produces: `sendMessage(text, model, options?: { attachments?: Attachment[]; includeImages?: boolean })` — Task 6's ChatView calls this exact signature. Missing image files surface as a Toast from inside the hook.

- [ ] **Step 1: Update `src/hooks/useChat.ts`** — replace the imports and `sendMessage` callback (the rest of the hook is unchanged):

New imports at the top:

```ts
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { chatStream, getConfig } from "../lib/lmstudio";
import { buildApiMessages } from "../lib/payload";
import * as storage from "../lib/storage";
import { Attachment, Chat, Message } from "../lib/types";
```

Replace the `sendMessage` callback with:

```ts
  const sendMessage = useCallback(
    async (
      text: string,
      model: string,
      options?: { attachments?: Attachment[]; includeImages?: boolean },
    ) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      setError(null);

      const prefs = getPreferenceValues<Preferences>();
      const rawTemperature = prefs.temperature?.trim();
      const parsedTemperature = rawTemperature ? Number(rawTemperature) : NaN;
      const temperature = Number.isFinite(parsedTemperature)
        ? parsedTemperature
        : 0.7;
      const systemPrompt = prefs.systemPrompt?.trim();

      let current: Chat = chat ?? (await storage.createChat(model));
      if (current.messages.length === 0) {
        current = { ...current, title: storage.deriveTitle(trimmed) };
      }
      const attachments = options?.attachments ?? [];
      const userMessage: Message = {
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
        ...(attachments.length > 0 ? { attachments } : {}),
      };
      const assistantMessage: Message = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      current = {
        ...current,
        model,
        messages: [...current.messages, userMessage, assistantMessage],
      };
      setChat(current);

      const { messages: apiMessages, skippedImages } = await buildApiMessages(
        { ...current, messages: current.messages.slice(0, -1) },
        { systemPrompt, includeImages: options?.includeImages ?? false },
      );
      if (skippedImages.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Some images were skipped",
          message: `File(s) no longer exist: ${skippedImages.join(", ")}`,
        });
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      let content = "";
      try {
        for await (const delta of chatStream(getConfig(), {
          model,
          messages: apiMessages,
          temperature,
          signal: controller.signal,
        })) {
          content += delta;
          current = {
            ...current,
            messages: [
              ...current.messages.slice(0, -1),
              { ...assistantMessage, content },
            ],
          };
          setChat(current);
        }
      } catch (e) {
        const aborted = e instanceof DOMException && e.name === "AbortError";
        if (!aborted) setError(e as Error);
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        // Persist even on error/abort so a partial answer is kept (spec requirement).
        await storage.saveChat(current);
      }
    },
    [chat, isStreaming],
  );
```

- [ ] **Step 2: Verify**

Run: `npx vitest run` → all pass. `npm run build` → exit 0. `npm run lint` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "feat: send attachments with chat messages"
```

---

### Task 6: ChatView attach UX and vision gating

**Files:**
- Modify: `src/views/ChatView.tsx` (replace entire file)

**Interfaces:**
- Consumes: `classifyPath`, `MAX_ATTACHMENTS_PER_MESSAGE` (Task 1); `hasAttachments` (Task 4); `sendMessage` options (Task 5); `ChatModel` shape from `useLoadedModels` (Task 3).
- Produces: final UI. No exports besides `ChatView`.

- [ ] **Step 1: Replace `src/views/ChatView.tsx`** with this complete, final version (no placeholders — type it exactly):

```tsx
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  getSelectedFinderItems,
  showToast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useConversation } from "../hooks/useChat";
import { useLoadedModels } from "../hooks/useModels";
import { MAX_ATTACHMENTS_PER_MESSAGE, classifyPath } from "../lib/attachments";
import { isConnectionError } from "../lib/lmstudio";
import {
  answerText,
  hasAttachments,
  modelColor,
  shortModelName,
  splitIntoTurns,
  turnMarkdown,
} from "../lib/transcript";
import { Attachment } from "../lib/types";

interface Preferences {
  defaultModel?: string;
}

/**
 * Conversation Map view: the search bar IS the message input; the left column
 * lists each turn (newest first) with a model tag and a live dot while
 * streaming; the right pane shows the selected turn Quick AI style.
 * Attachments are added via Finder/clipboard actions into a pending draft
 * that ships with the next Enter.
 */
export function ChatView(props: { chatId?: string; initialPrompt?: string }) {
  const { chat, isStreaming, error, sendMessage, newChat } = useConversation(
    props.chatId,
  );
  const {
    models,
    isLoading: modelsLoading,
    error: modelsError,
    revalidate,
  } = useLoadedModels();
  const [searchText, setSearchText] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>(
    [],
  );
  const initialSentRef = useRef(false);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Chat request failed",
        message: error.message,
      });
    }
  }, [error]);

  const modelIds = (models ?? []).map((m) => m.id);
  const preferredModel =
    getPreferenceValues<Preferences>().defaultModel?.trim();
  const effectiveModel =
    selectedModel ||
    (chat?.model && modelIds.includes(chat.model) ? chat.model : undefined) ||
    (preferredModel && modelIds.includes(preferredModel)
      ? preferredModel
      : modelIds[0]) ||
    "";
  const effectiveVision =
    (models ?? []).find((m) => m.id === effectiveModel)?.vision ?? false;

  // Fire the launch-argument question once the model list arrives.
  useEffect(() => {
    if (
      props.initialPrompt?.trim() &&
      !initialSentRef.current &&
      effectiveModel &&
      !props.chatId
    ) {
      initialSentRef.current = true;
      sendMessage(props.initialPrompt, effectiveModel);
    }
  }, [effectiveModel, props.initialPrompt, props.chatId, sendMessage]);

  async function addAttachments(paths: string[]) {
    const next = [...pendingAttachments];
    let added = 0;
    const problems: string[] = [];
    for (const path of paths) {
      if (next.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
        problems.push(`limit is ${MAX_ATTACHMENTS_PER_MESSAGE} per message`);
        break;
      }
      const result = await classifyPath(path);
      if (!result.ok) {
        problems.push(result.reason);
        continue;
      }
      if (result.attachment.type === "image" && !effectiveVision) {
        problems.push(`${result.attachment.name}: model has no vision support`);
        continue;
      }
      next.push(result.attachment);
      added += 1;
    }
    setPendingAttachments(next);
    if (problems.length > 0) {
      await showToast({
        style: added > 0 ? Toast.Style.Success : Toast.Style.Failure,
        title:
          added > 0 ? `Attached ${added}, skipped ${problems.length}` : "Not attached",
        message: problems[0],
      });
    } else if (added > 0) {
      await showToast({
        style: Toast.Style.Success,
        title: `Attached ${added} file${added > 1 ? "s" : ""}`,
      });
    }
  }

  async function attachFromFinder() {
    try {
      const items = await getSelectedFinderItems();
      if (items.length === 0) throw new Error("empty");
      await addAttachments(items.map((i) => i.path));
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Finder selection",
        message: "Select file(s) in Finder first.",
      });
    }
  }

  async function attachFromClipboard() {
    const { file } = await Clipboard.read();
    if (!file) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file in clipboard",
        message: "Copy a file or take a screenshot to a file first.",
      });
      return;
    }
    const path = decodeURIComponent(file.replace(/^file:\/\//, ""));
    await addAttachments([path]);
  }

  async function handleSend() {
    if (!searchText.trim()) return;
    if (isStreaming) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Still answering",
        message: "Wait for the current answer to finish.",
      });
      return;
    }
    if (!effectiveModel) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No model available",
        message: "Load or download a model in LM Studio first.",
      });
      return;
    }
    if (
      pendingAttachments.some((a) => a.type === "image") &&
      !effectiveVision
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Model has no vision support",
        message: "Pick a vision-capable model or clear image attachments.",
      });
      return;
    }
    const text = searchText;
    const attachments = pendingAttachments;
    setSearchText("");
    setPendingAttachments([]);
    await sendMessage(text, effectiveModel, {
      attachments,
      includeImages: effectiveVision,
    });
  }

  if (modelsError) {
    const connection = isConnectionError(modelsError);
    return (
      <List>
        <List.EmptyView
          icon={connection ? Icon.Plug : Icon.Warning}
          title={
            connection
              ? "LM Studio is not running"
              : "Failed to reach LM Studio"
          }
          description={
            connection
              ? "Open the LM Studio app or run `lms server start`, then retry."
              : modelsError.message
          }
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const sendAction = (
    <Action
      title={chat ? "Ask Follow-Up" : "Send Message"}
      icon={Icon.ArrowUp}
      onAction={handleSend}
    />
  );

  const attachActions = (
    <>
      <Action
        title="Attach Finder Selection"
        icon={Icon.Finder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        onAction={attachFromFinder}
      />
      <Action
        title="Attach from Clipboard"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["opt", "cmd"], key: "v" }}
        onAction={attachFromClipboard}
      />
      {pendingAttachments.length > 0 && (
        <Action
          title="Clear Attachments"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          onAction={() => setPendingAttachments([])}
        />
      )}
    </>
  );

  const noModels = models !== undefined && models.length === 0;
  const turns = chat ? splitIntoTurns(chat) : [];
  // Newest turn first; it is also the streaming one, so keep it selected.
  const reversed = [...turns].reverse();
  const streamingUserIndex =
    isStreaming && turns.length > 0 ? turns[turns.length - 1].userIndex : -1;
  const attachSuffix =
    pendingAttachments.length > 0 ? ` · 📎 ${pendingAttachments.length}` : "";
  const attachPrefix =
    pendingAttachments.length > 0 ? `📎 ${pendingAttachments.length} · ` : "";

  return (
    <List
      isLoading={isStreaming || modelsLoading}
      isShowingDetail={!!chat}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`${attachPrefix}${chat ? "Ask follow-up…" : "Ask anything…"}`}
      navigationTitle={`${chat ? `${chat.title} — ${chat.model}` : "New Chat"}${attachSuffix}`}
      selectedItemId={
        chat && turns.length > 0
          ? `turn-${turns[turns.length - 1].userIndex}`
          : undefined
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Model"
          value={effectiveModel}
          onChange={setSelectedModel}
        >
          {(models ?? []).map((m) => (
            <List.Dropdown.Item key={m.id} title={m.id} value={m.id} />
          ))}
        </List.Dropdown>
      }
    >
      {!chat ? (
        <List.EmptyView
          icon={noModels ? Icon.HardDrive : Icon.Message}
          title={noModels ? "No model available" : "Ask anything"}
          description={
            noModels
              ? "Download a model in the LM Studio app first."
              : "Type your question above and press Enter."
          }
          actions={
            <ActionPanel>
              {sendAction}
              {attachActions}
            </ActionPanel>
          }
        />
      ) : (
        reversed.map((turn) => {
          const isStreamingTurn = turn.userIndex === streamingUserIndex;
          const model = chat.model;
          return (
            <List.Item
              key={turn.userIndex}
              id={`turn-${turn.userIndex}`}
              icon={
                isStreamingTurn
                  ? { source: Icon.Dot, tintColor: Color.Green }
                  : Icon.Bubble
              }
              title={
                turn.question.content.replace(/\s+/g, " ").slice(0, 40) || "…"
              }
              accessories={[
                ...(hasAttachments(turn) ? [{ icon: Icon.Paperclip }] : []),
                {
                  tag: {
                    value: shortModelName(model),
                    color: modelColor(model),
                  },
                },
                {
                  date: new Date(
                    turn.answer?.timestamp ?? turn.question.timestamp,
                  ),
                },
              ]}
              detail={
                <List.Item.Detail markdown={turnMarkdown(turn, model)} />
              }
              actions={
                <ActionPanel>
                  {sendAction}
                  {attachActions}
                  <Action.CopyToClipboard
                    title="Copy Answer"
                    content={answerText(turn)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.Paste
                    title="Paste Answer to Active App"
                    content={answerText(turn)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                  />
                  <Action
                    title="New Chat"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onAction={newChat}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx vitest run` → all pass. `npm run build` → exit 0. `npm run lint` → clean (fix-lint if Prettier complains, then re-verify).

- [ ] **Step 3: Commit**

```bash
git add src/views/ChatView.tsx
git commit -m "feat: attach files and images from Finder or clipboard with vision gating"
```

---

### Task 7: Docs, full verification, and live API check

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: the completed feature. Produces documented, verified state.

- [ ] **Step 1: Update README**

In `README.md` under `### Chat`, append this paragraph after the existing one:

```markdown
Attach files with **⌘⇧A** (files selected in Finder) or **⌥⌘V** (file/image in the clipboard). Images go to vision-capable models as real image input; text and code files are added to the prompt as context. Pending attachments show as a 📎 counter in the search bar and ship with your next Enter. Up to 5 attachments per message (images ≤ 10 MB, text ≤ 200 KB).
```

In the Features-style bullet list section (if present) no change is needed; in `## Troubleshooting` append:

```markdown
- **"Model has no vision support"** — the selected model can't process images. Pick a vision-capable model (LM Studio shows a vision badge) or remove the image attachments; text file attachments work with every model.
```

- [ ] **Step 2: Update CHANGELOG**

The extension is not yet published (the store PR is pending), so extend the single `## [Initial Version] - {PR_MERGE_DATE}` entry — append these bullets to its list:

```markdown
- Attach images (sent to vision models) and text/code files (added to the prompt as context) from Finder selection or the clipboard
```

- [ ] **Step 3: Full verification suite**

Run: `npm test && npm run lint && npm run build`
Expected: all exit 0 (title-case lint warning acceptable).

- [ ] **Step 4: Live API smoke test (requires LM Studio server; no Raycast UI needed)**

The server was started earlier with `~/.lmstudio/bin/lms server start`; start it again if down. Then verify the multimodal contract end-to-end:

```bash
cd "$(git rev-parse --show-toplevel)"
python3 - <<'EOF'
import base64, json, urllib.request
png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
body = {
    "model": "google/gemma-4-e4b",
    "messages": [{"role": "user", "content": [
        {"type": "text", "text": "Describe this image in one short sentence."},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64," + base64.b64encode(png).decode()}},
    ]}],
    "stream": False,
}
req = urllib.request.Request("http://localhost:1234/v1/chat/completions",
    data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
resp = json.load(urllib.request.urlopen(req, timeout=300))
content = resp["choices"][0]["message"]["content"]
assert content.strip(), "empty content"
print("LIVE OK:", content[:120])
EOF
```

Expected: prints `LIVE OK: ...` (any non-empty description; the model may auto-load first, which can take a minute). If it fails with an HTTP error, read the response body — a contract mismatch here must be fixed in `payload.ts` before proceeding.

- [ ] **Step 5: Manual end-to-end checklist (user does this in Raycast UI — record as deferred)**

1. Finder'da bir PNG seç → Chat'te ⌘⇧A → placeholder "📎 1 · …" olur; soru sor → cevap görseli anlıyor; transkriptte görsel görünüyor.
2. Bir .md dosyası ekle → "summarize" → cevap dosya içeriğini kullanıyor; transkriptte "📎 notes.md".
3. Vision'sız bir modelle görsel eklemeyi dene → toast engeli.
4. Görselli eski sohbete follow-up → görsel bağlamı korunuyor.
5. Görsel dosyasını sil → follow-up'ta "Some images were skipped" toast'ı, mesaj yine gidiyor.

- [ ] **Step 6: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: document file and image attachments"
```
