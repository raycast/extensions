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
