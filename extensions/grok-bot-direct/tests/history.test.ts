import { describe, expect, it, vi } from "vitest";
import { Entry, Transcript } from "../src/core/client";
import {
  HistoryStore,
  mergeHistory,
  plainPreview,
  replyThreads,
  transcriptMarkdown,
} from "../src/core/history";
import { renderRichText } from "../src/core/rich-text";

function message(
  id: string,
  content: string,
  timestampMs = 0,
  extra: Partial<Entry> = {},
): Entry {
  return { id, kind: "message", role: "user", content, timestampMs, ...extra };
}

describe("readable transcripts", () => {
  it("preserves paragraphs, tables, code indentation, links, and display LaTeX", () => {
    const response =
      String.raw`## Result

A paragraph that should wrap naturally without inserting newlines into the underlying content.

- **First** item
- [Source](https://example.test)

| Input | Output |
| --- | --- |
| 1 | 2 |

\[
\begin{aligned}
f(x) &= x^2 \\
f'(x) &= 2x
\end{aligned}
\]` +
      "\n\n```python\ndef square(x):\n    return x ** 2  # preserve indentation\n```";
    const entries = [
      message("t1u0", "Explain the calculation."),
      {
        id: "t1s0",
        kind: "send-message",
        message: { type: "text", content: response },
        timestampMs: 1,
      },
    ];
    const output = transcriptMarkdown(
      entries,
      "Algebra Bot",
      "Main Conversation",
    );
    expect(output).toContain(response);
    expect(output.indexOf("Explain")).toBeLessThan(output.indexOf("## Result"));
    expect(output).toContain("**You");
    expect(output).toContain("**Algebra Bot");
  });
  it("normalizes inline dollar math without changing fenced or inline code", () => {
    expect(
      renderRichText(
        "We have $x^2 + y^2$ and $z$. `echo $HOME`\n\n```latex\n$x^2$\n```",
      ),
    ).toBe(
      "We have \\(x^2 + y^2\\) and \\(z\\). `echo $HOME`\n\n```latex\n$x^2$\n```",
    );
    expect(renderRichText(String.raw`\(a+b\) and $$c+d$$`)).toBe(
      String.raw`\(a+b\) and $$c+d$$`,
    );
    expect(renderRichText(String.raw`Costs \$5.00.`)).toBe(
      String.raw`Costs \$5.00.`,
    );
    expect(renderRichText("No math here.")).toBe("No math here.");
  });
  it("escapes display names without escaping the response content", () => {
    const output = transcriptMarkdown(
      [
        message("x", "**Keep this bold**", NaN, {
          role: "assistant",
          isStreaming: true,
        }),
      ],
      "Bot [link](evil)",
      "# Title",
    );
    expect(output).toContain("Bot \\[link\\]\\(evil\\)");
    expect(output).toContain("**Keep this bold**");
    expect(output).toContain("Responding");
    expect(output).not.toContain("Invalid Date");
    expect(transcriptMarkdown([], "Bot", "Chat")).toContain("No messages");
  });
  it("keeps raw tool activity out of the chat reading view", () =>
    expect(
      transcriptMarkdown(
        [{ id: "e", kind: "event", event: { type: "internal" } }],
        "Bot",
        "Chat",
      ),
    ).not.toContain("internal"));
  it("produces compact thread titles without leaking raw Markdown decoration", () =>
    expect(
      plainPreview(
        "## **Title**\n[read](https://example.test)\n```js\nlet x = 1;\n```",
      ),
    ).toBe("Title read [Code]"));
});

describe("history and thread identity", () => {
  it("merges older pages and authoritative updates without duplicates or text loss", () => {
    const entries = mergeHistory(
      [message("t2u0", "new", 2)],
      [message("t1u0", "old", 1)],
      true,
    );
    const updated = mergeHistory(entries, [
      message("t2u0", "updated", 2),
      message("t3u0", "latest", 3),
    ]);
    expect(updated.map((e) => e.content)).toEqual(["old", "updated", "latest"]);
  });
  it("preserves the identity invariant across overlapping pages", () => {
    let entries: Entry[] = [];
    for (let batch = 0; batch < 20; batch++)
      entries = mergeHistory(
        entries,
        Array.from({ length: 10 }, (_, i) =>
          message(
            `t${batch * 5 + i}u0`,
            `value-${batch * 5 + i}`,
            batch * 5 + i,
          ),
        ),
      );
    expect(entries).toHaveLength(105);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    expect(entries[0].content).toBe("value-0");
    expect(entries.at(-1)?.content).toBe("value-104");
  });
  it("indexes nested real replies beneath their actual root", () => {
    const threads = replyThreads([
      message("t1u0", "**Topic**", 1),
      message("t2u0", "Reply", 2, { replyTo: "t1u0" }),
      message("t3u0", "Nested", 3, { replyTo: "t2u0" }),
      message("t4u0", "Earlier", 4, { replyTo: "not-loaded" }),
    ]);
    expect(threads).toEqual([
      {
        rootId: "not-loaded",
        title: "Thread from earlier history",
        replyCount: 1,
        lastActivity: 4,
      },
      { rootId: "t1u0", title: "Topic", replyCount: 2, lastActivity: 3 },
    ]);
    expect(replyThreads([message("a", "main")])).toEqual([]);
    expect(replyThreads([message("a", "cycle", 0, { replyTo: "a" })])).toEqual(
      [],
    );
  });
});

describe("loaded conversation cache", () => {
  it("retains older history when the live tail refreshes", async () => {
    const api = {
      transcript: vi
        .fn()
        .mockResolvedValueOnce({
          entries: [message("t2u0", "new", 2)],
          nextBeforeSeq: 2,
        })
        .mockResolvedValueOnce({
          entries: [message("t1u0", "old", 1)],
          nextBeforeSeq: 1,
        })
        .mockResolvedValueOnce({
          entries: [message("t2u0", "updated", 2)],
          nextBeforeSeq: 2,
        }),
      thread: vi.fn(),
    };
    const store = new HistoryStore(api);
    const update = vi.fn();
    const unsubscribe = store.subscribe("bot", undefined, update);
    await store.load("bot");
    await store.load("bot", undefined, true);
    await store.load("bot");
    expect(store.read("bot").entries.map((e) => e.content)).toEqual([
      "old",
      "updated",
    ]);
    expect(store.read("bot").before).toBe(1);
    expect(update).toHaveBeenCalledTimes(3);
    unsubscribe();
  });
  it("keeps bots and reply threads separate", async () => {
    const api = {
      transcript: vi
        .fn()
        .mockResolvedValue({ entries: [message("a", "main")] }),
      thread: vi.fn().mockResolvedValue({ entries: [message("r", "reply")] }),
    };
    const store = new HistoryStore(api);
    await store.load("bot-a");
    await store.load("bot-b", "root");
    expect(api.thread).toHaveBeenCalledWith("bot-b", "root");
    expect(store.read("bot-a").entries[0].content).toBe("main");
    expect(store.read("bot-b").entries).toEqual([]);
    await store.load("bot-b", "root", true);
    expect(api.thread).toHaveBeenCalledTimes(1);
  });
  it("coalesces in-flight requests and discards them on account reset", async () => {
    let resolve!: (value: Transcript) => void;
    const api = {
      transcript: vi.fn(
        () =>
          new Promise<Transcript>((done) => {
            resolve = done;
          }),
      ),
      thread: vi.fn(),
    };
    const store = new HistoryStore(api);
    const first = store.load("bot");
    const second = store.load("bot");
    expect(api.transcript).toHaveBeenCalledTimes(1);
    store.clear();
    resolve({ entries: [message("private", "old account")] });
    await Promise.all([first, second]);
    expect(store.read("bot").entries).toEqual([]);
  });
  it("keeps loaded text visible on network errors", async () => {
    const api = {
      transcript: vi
        .fn()
        .mockResolvedValueOnce({ entries: [message("a", "kept")] })
        .mockRejectedValueOnce(new Error("offline")),
      thread: vi.fn(),
    };
    const store = new HistoryStore(api);
    await store.load("bot");
    await store.load("bot");
    expect(store.read("bot").entries[0].content).toBe("kept");
    expect(store.read("bot").error).toBe("offline");
    await store.load("bot", undefined, true);
    expect(api.transcript).toHaveBeenCalledTimes(2);
  });
  it("bounds inactive conversation caches while retaining active ones", async () => {
    const api = {
      transcript: vi.fn().mockResolvedValue({ entries: [] }),
      thread: vi.fn(),
    };
    const store = new HistoryStore(api);
    const unsubscribe = store.subscribe("active", undefined, () => undefined);
    await store.load("active");
    for (let i = 0; i < 12; i++) await store.load(`bot-${i}`);
    expect(store.read("active").loaded).toBe(true);
    expect(store.read("bot-0").loaded).toBe(false);
    expect(store.read("bot-11").loaded).toBe(true);
    unsubscribe();
  });
});
