import { describe, expect, it } from "vitest";
import { MarkdownReformatter } from "../src/lib/markdown-reformatter";

describe("MarkdownReformatter", () => {
  it("reflows wrapped bullets and keeps blank lines", () => {
    const input = `- OpenAI Responses 400: "Item 'rs_...' of type 'reasoning' was provided
  without its required following item."
- Trigger: history replay includes assistant turns with only
  thinking/reasoning (often from aborted runs). pi-ai replays
  thinkingSignature as a reasoning item even when the same turn has
  no message or function_call.

Fix summary (pi-mono)

- packages/ai/src/providers/openai-responses.ts: only replay
  reasoning if the assistant turn also has text or toolCall; prevents
  lone reasoning items.
- Regression test added: packages/ai/test/openai-responses-reasoning-
  replay.test.ts.
- Changelog entry under packages/ai/CHANGELOG.md.`;

    const expected = [
      `- OpenAI Responses 400: "Item 'rs_...' of type 'reasoning' was provided without its required following item."`,
      `- Trigger: history replay includes assistant turns with only thinking/reasoning (often from aborted runs). pi-ai replays thinkingSignature as a reasoning item even when the same turn has no message or function_call.`,
      "",
      "Fix summary (pi-mono)",
      "",
      `- packages/ai/src/providers/openai-responses.ts: only replay reasoning if the assistant turn also has text or toolCall; prevents lone reasoning items.`,
      `- Regression test added: packages/ai/test/openai-responses-reasoning-replay.test.ts.`,
      `- Changelog entry under packages/ai/CHANGELOG.md.`,
    ].join("\n");

    expect(MarkdownReformatter.reformat(input)).toBe(expected);
  });

  it("keeps fenced code blocks", () => {
    const input = `- First item with code:
\`\`\`
let a = 1
let b = 2
\`\`\`
- Second item`;
    expect(MarkdownReformatter.reformat(input)).toBe(input);
  });

  it("reflows paragraphs and bullet glyph lists", () => {
    const input = `The test process is still running, so I'll keep polling for updates
  until completion and then respond with the final status.

• Hi Peter — the CI run 21126984283 is still in progress. The Android
  test succeeded, while Windows test, Bun test, Node test, macOS app,
  macOS checks, and iOS tests remain. If you'd like me to keep
  watching, just say "continue."`;

    const expected = [
      "The test process is still running, so I'll keep polling for updates until completion and then respond with the final status.",
      "",
      '• Hi Peter — the CI run 21126984283 is still in progress. The Android test succeeded, while Windows test, Bun test, Node test, macOS app, macOS checks, and iOS tests remain. If you\'d like me to keep watching, just say "continue."',
    ].join("\n");

    expect(MarkdownReformatter.reformat(input)).toBe(expected);
  });

  it("detects markdown by headings and lists", () => {
    expect(MarkdownReformatter.isLikelyMarkdown("## Title\n- One\n- Two")).toBe(true);
  });

  it("ignores plain wrapped text", () => {
    expect(MarkdownReformatter.isLikelyMarkdown("This is a wrapped paragraph\nwith no markdown markers.")).toBe(false);
  });
});
