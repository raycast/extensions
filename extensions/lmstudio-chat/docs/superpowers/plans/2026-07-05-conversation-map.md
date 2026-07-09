# Conversation Map Layout + Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Chat command so the left column is a live "Conversation Map" (one row per user turn, newest first, with a model-colored tag, relative time, and a live dot on the streaming turn) and the right pane shows the selected turn in Quick AI style, plus a concept logo.

**Architecture:** Pure transcript/turn helpers move into a new unit `src/lib/transcript.ts` and are unit-tested independently of React. `ChatView` consumes them to render a `List` + `isShowingDetail` where each turn is its own `List.Item`. A generated 512×512 PNG replaces the placeholder icon.

**Tech Stack:** TypeScript, React (`@raycast/api`), `@raycast/utils`, vitest. Logo rendered with whatever raster tool is available (PIL / rsvg / cairosvg), falling back to direct PNG drawing.

## Global Constraints

- Working directory for all commands: `lmstudio-chat/` (repo root; already a git repo on branch `feat/conversation-map-logo`).
- No runtime dependencies beyond `@raycast/api` and `@raycast/utils`. Logo tooling is build-time only and must NOT be added to `package.json`.
- `npm run lint` (= `ray lint`) must exit 0 (one known non-failing title-case warning about "LM Studio Chat" is acceptable); `npm run build` must exit 0; `npm test` must stay green.
- UI copy in English. Server-down guidance mentions `lms server start` (unchanged).
- Model lists are fetched fresh with a 10s refresh (already implemented in `useLoadedModels`; do not change).
- The Chat command always starts a new conversation; `history` continues past chats via `<ChatView chatId={...} />`. Do not change that contract.
- `icon.png` must be 512×512 and pass `ray build` icon validation.
- Commit after every task; conventional-commit messages.

---

### Task 1: Transcript/turn helpers (pure module)

**Files:**
- Create: `src/lib/transcript.ts`
- Test: `tests/transcript.test.ts`

**Interfaces:**
- Consumes: `Chat`, `Message` from `src/lib/types.ts`; `Color` from `@raycast/api`.
- Produces (used by Task 2):
  - `interface Turn { question: Message; answer?: Message; userIndex: number }`
  - `splitIntoTurns(chat: Chat): Turn[]` — walks `chat.messages` in order; each `user` message starts a new turn at its index, a following `assistant` message becomes that turn's `answer`. Returned in message order (oldest first); the caller reverses for display.
  - `turnMarkdown(turn: Turn, model: string): string` — Quick AI style block.
  - `shortModelName(modelId: string): string` — substring after the last `/` (or the whole string if no `/`).
  - `modelColor(modelId: string): Color` — deterministic pick from a fixed palette.
  - `answerText(turn: Turn): string` — `turn.answer?.content ?? ""`.

- [ ] **Step 1: Write the failing tests**

`tests/transcript.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  answerText,
  modelColor,
  shortModelName,
  splitIntoTurns,
  turnMarkdown,
} from "../src/lib/transcript";
import { Chat, Message } from "../src/lib/types";

function msg(role: "user" | "assistant", content: string): Message {
  return { role, content, timestamp: 0 };
}

function chat(messages: Message[]): Chat {
  return {
    id: "c1",
    title: "t",
    model: "google/gemma-4-e4b",
    messages,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("splitIntoTurns", () => {
  it("pairs each user message with the following assistant message", () => {
    const turns = splitIntoTurns(
      chat([msg("user", "q1"), msg("assistant", "a1"), msg("user", "q2"), msg("assistant", "a2")]),
    );
    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({ userIndex: 0 });
    expect(turns[0].question.content).toBe("q1");
    expect(turns[0].answer?.content).toBe("a1");
    expect(turns[1].userIndex).toBe(2);
    expect(turns[1].answer?.content).toBe("a2");
  });

  it("handles a trailing user message with no answer yet", () => {
    const turns = splitIntoTurns(chat([msg("user", "q1")]));
    expect(turns).toHaveLength(1);
    expect(turns[0].answer).toBeUndefined();
  });

  it("returns [] for an empty chat", () => {
    expect(splitIntoTurns(chat([]))).toEqual([]);
  });
});

describe("answerText", () => {
  it("returns the answer content or empty string", () => {
    const [t] = splitIntoTurns(chat([msg("user", "q"), msg("assistant", "a")]));
    expect(answerText(t)).toBe("a");
    const [t2] = splitIntoTurns(chat([msg("user", "q")]));
    expect(answerText(t2)).toBe("");
  });
});

describe("turnMarkdown", () => {
  it("renders the You / model / answer block", () => {
    const [t] = splitIntoTurns(chat([msg("user", "hi"), msg("assistant", "hello")]));
    const md = turnMarkdown(t, "google/gemma-4-e4b");
    expect(md).toContain("**🧑 You**");
    expect(md).toContain("hi");
    expect(md).toContain("**🤖 google/gemma-4-e4b**");
    expect(md).toContain("hello");
    expect(md).toContain("---");
  });

  it("shows an ellipsis while the answer is empty (streaming/pending)", () => {
    const [t] = splitIntoTurns(chat([msg("user", "hi")]));
    expect(turnMarkdown(t, "m")).toContain("…");
  });
});

describe("shortModelName", () => {
  it("takes the part after the last slash", () => {
    expect(shortModelName("google/gemma-4-e4b")).toBe("gemma-4-e4b");
    expect(shortModelName("mistral")).toBe("mistral");
  });
});

describe("modelColor", () => {
  it("is deterministic for the same model id", () => {
    expect(modelColor("google/gemma-4-e4b")).toBe(modelColor("google/gemma-4-e4b"));
  });

  it("returns a value from the palette", () => {
    const palette = [
      "raycast-blue",
      "raycast-green",
      "raycast-magenta",
      "raycast-orange",
      "raycast-purple",
      "raycast-red",
      "raycast-yellow",
    ];
    expect(palette).toContain(modelColor("any-model"));
  });
});
```

Note on the palette assertion: `Color.Blue` etc. are string constants (e.g. `"raycast-blue"`). The test asserts the returned value is one of those raw strings, so it does not need to import `Color`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `../src/lib/transcript`. (Existing suites still pass.)

- [ ] **Step 3: Write `src/lib/transcript.ts`**

```ts
import { Color } from "@raycast/api";
import { Chat, Message } from "./types";

export interface Turn {
  question: Message;
  answer?: Message;
  userIndex: number;
}

export function splitIntoTurns(chat: Chat): Turn[] {
  const turns: Turn[] = [];
  chat.messages.forEach((m, index) => {
    if (m.role === "user") {
      turns.push({ question: m, userIndex: index });
    } else if (turns.length > 0 && !turns[turns.length - 1].answer) {
      turns[turns.length - 1].answer = m;
    }
  });
  return turns;
}

export function answerText(turn: Turn): string {
  return turn.answer?.content ?? "";
}

export function turnMarkdown(turn: Turn, model: string): string {
  return (
    `**🧑 You**\n\n${turn.question.content}\n\n` +
    `---\n\n` +
    `**🤖 ${model}**\n\n${turn.answer?.content || "…"}`
  );
}

export function shortModelName(modelId: string): string {
  const slash = modelId.lastIndexOf("/");
  return slash >= 0 ? modelId.slice(slash + 1) : modelId;
}

const PALETTE: Color[] = [
  Color.Blue,
  Color.Green,
  Color.Magenta,
  Color.Orange,
  Color.Purple,
  Color.Red,
  Color.Yellow,
];

export function modelColor(modelId: string): Color {
  let hash = 0;
  for (let i = 0; i < modelId.length; i++) {
    hash = (hash * 31 + modelId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green (existing 25 + new transcript tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transcript.ts tests/transcript.test.ts
git commit -m "feat: add transcript turn helpers for conversation map"
```

---

### Task 2: Conversation Map ChatView + history import fix

**Files:**
- Modify: `src/views/ChatView.tsx` (replace `buildTranscript`/`lastAnswer` usage and the render body)
- Modify: `src/history.tsx:5` (update the import that currently pulls `lastAnswer` from `ChatView`)

**Interfaces:**
- Consumes: `splitIntoTurns`, `turnMarkdown`, `shortModelName`, `modelColor`, `answerText`, `Turn` from `src/lib/transcript.ts`; existing `useConversation`, `useLoadedModels`, `isConnectionError`.
- Produces: the reworked `ChatView`. `history.tsx` must keep compiling — it currently imports `lastAnswer` from `./views/ChatView`.

- [ ] **Step 1: Rewrite `src/views/ChatView.tsx`**

Replace the ENTIRE file with this complete, final version (no placeholders — type it exactly):

```tsx
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useConversation } from "../hooks/useChat";
import { useLoadedModels } from "../hooks/useModels";
import { isConnectionError } from "../lib/lmstudio";
import {
  answerText,
  modelColor,
  shortModelName,
  splitIntoTurns,
  turnMarkdown,
} from "../lib/transcript";

interface Preferences {
  defaultModel?: string;
}

/**
 * Conversation Map view: the search bar IS the message input; the left column
 * lists each turn (newest first) with a model tag and a live dot while
 * streaming; the right pane shows the selected turn Quick AI style.
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

  const preferredModel =
    getPreferenceValues<Preferences>().defaultModel?.trim();
  const effectiveModel =
    selectedModel ||
    (chat?.model && models?.includes(chat.model) ? chat.model : undefined) ||
    (preferredModel && models?.includes(preferredModel)
      ? preferredModel
      : models?.[0]) ||
    "";

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
    const text = searchText;
    setSearchText("");
    await sendMessage(text, effectiveModel);
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

  const noModels = models !== undefined && models.length === 0;
  const turns = chat ? splitIntoTurns(chat) : [];
  // Newest turn first; it is also the streaming one, so keep it selected.
  const reversed = [...turns].reverse();
  const streamingUserIndex =
    isStreaming && turns.length > 0 ? turns[turns.length - 1].userIndex : -1;

  return (
    <List
      isLoading={isStreaming || modelsLoading}
      isShowingDetail={!!chat}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={chat ? "Ask follow-up…" : "Ask anything…"}
      navigationTitle={chat ? `${chat.title} — ${chat.model}` : "New Chat"}
      selectedItemId={
        chat && turns.length > 0 ? `turn-${turns.length - 1}` : undefined
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Model"
          value={effectiveModel}
          onChange={setSelectedModel}
        >
          {(models ?? []).map((m) => (
            <List.Dropdown.Item key={m} title={m} value={m} />
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
          actions={<ActionPanel>{sendAction}</ActionPanel>}
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
                {
                  tag: {
                    value: shortModelName(model),
                    color: modelColor(model),
                  },
                },
                { date: new Date(chat.updatedAt) },
              ]}
              detail={
                <List.Item.Detail markdown={turnMarkdown(turn, model)} />
              }
              actions={
                <ActionPanel>
                  {sendAction}
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

- [ ] **Step 2: Fix the `history.tsx` import**

`lastAnswer` no longer exists in `ChatView`. In `src/history.tsx`, change line 5 and the usage:

Replace:
```tsx
import { ChatView, lastAnswer } from "./views/ChatView";
```
with:
```tsx
import { ChatView } from "./views/ChatView";
import { answerText, splitIntoTurns } from "./lib/transcript";
```

Replace the copy action's content in `src/history.tsx`:
```tsx
              <Action.CopyToClipboard
                title="Copy Last Answer"
                content={lastAnswer(c)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
```
with:
```tsx
              <Action.CopyToClipboard
                title="Copy Last Answer"
                content={answerText(
                  splitIntoTurns(c)[splitIntoTurns(c).length - 1] ?? {
                    question: { role: "user", content: "", timestamp: 0 },
                    userIndex: 0,
                  },
                )}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
```

- [ ] **Step 3: Verify build, lint, tests**

Run: `npm run build && npm run lint && npm test`
Expected: build exits 0, lint exits 0 (title-case warning acceptable), tests all pass. If `ray lint --fix` (`npm run fix-lint`) reports fixable Prettier/shortcut issues, run it and re-check. If TypeScript flags an unused `streamingIndex`, confirm you deleted that line per Task 2 Step 1.

- [ ] **Step 4: Commit**

```bash
git add src/views/ChatView.tsx src/history.tsx
git commit -m "feat: conversation map left column with per-turn rows and model tags"
```

---

### Task 3: Concept logo

**Files:**
- Modify: `assets/icon.png` (overwrite)
- Create: `assets/icon.svg` (source, committed for future edits)

**Interfaces:**
- Consumes: nothing. Produces the final extension icon.

- [ ] **Step 1: Write the SVG source `assets/icon.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#A855F7"/>
      <stop offset="1" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="#1E1B2E"/>
  <path d="M120 130 h272 a40 40 0 0 1 40 40 v150 a40 40 0 0 1 -40 40 h-150 l-70 62 v-62 h-52 a40 40 0 0 1 -40 -40 v-150 a40 40 0 0 1 40 -40 z" fill="url(#g)"/>
  <g fill="#1E1B2E">
    <rect x="214" y="212" width="84" height="84" rx="16"/>
  </g>
  <g stroke="#1E1B2E" stroke-width="16" stroke-linecap="round">
    <line x1="256" y1="180" x2="256" y2="212"/>
    <line x1="256" y1="296" x2="256" y2="328"/>
    <line x1="182" y1="254" x2="214" y2="254"/>
    <line x1="298" y1="254" x2="330" y2="254"/>
  </g>
  <circle cx="256" cy="254" r="16" fill="url(#g)"/>
</svg>
```

- [ ] **Step 2: Detect an available raster tool**

Run:
```bash
{ command -v rsvg-convert && echo HAVE_RSVG; } ; \
{ command -v magick && echo HAVE_MAGICK; } ; \
{ command -v convert && echo HAVE_CONVERT; } ; \
python3 -c "import cairosvg" 2>/dev/null && echo HAVE_CAIROSVG ; \
python3 -c "import PIL; print('HAVE_PIL')" 2>/dev/null
```
Expected: at least one `HAVE_*` line. Note which one you got; use it in Step 3.

- [ ] **Step 3: Rasterize to `assets/icon.png` (512×512)**

Use the FIRST available tool from Step 2:

- If `HAVE_RSVG`: `rsvg-convert -w 512 -h 512 assets/icon.svg -o assets/icon.png`
- Else if `HAVE_MAGICK`: `magick -background none assets/icon.svg -resize 512x512 assets/icon.png`
- Else if `HAVE_CONVERT`: `convert -background none assets/icon.svg -resize 512x512 assets/icon.png`
- Else if `HAVE_CAIROSVG`: `python3 -c "import cairosvg; cairosvg.svg2png(url='assets/icon.svg', write_to='assets/icon.png', output_width=512, output_height=512)"`
- Else (`HAVE_PIL` only, no SVG support): draw the same design directly with Pillow:

```bash
python3 - <<'EOF'
from PIL import Image, ImageDraw
W = 512
img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
BG = (30, 27, 46, 255)
def lerp(a, b, t): return tuple(round(a[i] + (b[i]-a[i])*t) for i in range(3))
P, K = (168, 85, 247), (236, 72, 153)  # purple -> pink
d.rounded_rectangle([0, 0, W, W], radius=112, fill=BG)
# gradient speech bubble via a clipped diagonal fill
bubble = Image.new("RGBA", (W, W), (0, 0, 0, 0))
bd = ImageDraw.Draw(bubble)
bd.rounded_rectangle([80, 130, 432, 360], radius=40, fill=(255, 255, 255, 255))
bd.polygon([(226, 360), (226, 422), (296, 360)], fill=(255, 255, 255, 255))
grad = Image.new("RGBA", (W, W))
for y in range(W):
    for x in range(0, W, 1):
        t = (x + y) / (2 * W)
        grad.putpixel((x, y), lerp(P, K, t) + (255,))
img.paste(grad, (0, 0), bubble)
# chip square (background color) + legs + center node
d.rounded_rectangle([214, 212, 298, 296], radius=16, fill=BG)
for (x1, y1, x2, y2) in [(256,180,256,212),(256,296,256,328),(182,254,214,254),(298,254,330,254)]:
    d.line([x1, y1, x2, y2], fill=BG, width=16)
d.ellipse([240, 238, 272, 270], fill=lerp(P, K, 0.5) + (255,))
img.save("assets/icon.png")
print("wrote assets/icon.png")
EOF
```

Expected: `assets/icon.png` written.

- [ ] **Step 4: Verify the PNG dimensions**

Run: `file assets/icon.png`
Expected: `PNG image data, 512 x 512`.

- [ ] **Step 5: Verify the extension still builds with the new icon**

Run: `npm run build`
Expected: exits 0, including "validate extension icons". If icon validation fails, re-check Step 3/4 produced a true 512×512 PNG.

- [ ] **Step 6: Commit**

```bash
git add assets/icon.svg assets/icon.png
git commit -m "feat: add concept logo (speech bubble + chip)"
```

---

### Task 4: Docs + final verification

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: the completed feature. Produces documented, verified state.

- [ ] **Step 1: Update the README Features bullet for Chat**

In `README.md`, replace the first Features bullet:
```markdown
- **Chat**: always starts a fresh conversation; type the question directly as a command argument or in the opening form. The answer streams full-width (Quick AI style); press Enter to ask a follow-up.
```
with:
```markdown
- **Chat**: always starts a fresh conversation; type in the top bar and press Enter. The left column is a live conversation map (one row per turn, newest first, tagged with the answering model); the selected turn is shown Quick AI style on the right. Press Enter to ask a follow-up.
```

- [ ] **Step 2: Add a CHANGELOG entry**

Append to `CHANGELOG.md`:
```markdown

## [Conversation Map] - 2026-07-05

- Chat left column is now a conversation map: one row per turn, newest first, with a model-colored tag, relative time, and a live dot on the streaming turn
- Right pane shows the selected turn Quick AI style (You / model / answer)
- New concept logo (speech bubble + chip)
```

- [ ] **Step 3: Full verification suite**

Run: `npm test && npm run lint && npm run build`
Expected: all exit 0 (title-case lint warning acceptable).

- [ ] **Step 4: Manual end-to-end (requires LM Studio running with a loaded model)**

Run `npm run dev`, open Raycast → "Chat", and confirm:
1. Type a question + Enter → a turn row appears in the left column with the model tag; the right pane shows "🧑 You / 🤖 <model> / answer" streaming live, with a green dot on the streaming row.
2. Ask a follow-up → a new row appears at the top and is auto-selected.
3. Switch the model dropdown, ask again → the new turn's tag shows the new model in a different color.
4. Arrow to an older turn → its answer shows on the right.
5. Quit the LM Studio server → "LM Studio is not running" empty view with `lms server start`.
6. "Chat History" → continue a past chat → it opens in the same conversation-map view.

If any step fails, fix it (use superpowers:systematic-debugging) and re-run the failed item.

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: document conversation map layout and logo"
```
