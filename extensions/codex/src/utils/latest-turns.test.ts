import assert from "node:assert/strict";
import test from "node:test";
import { renderLatestTurnsMarkdown } from "./latest-turns.ts";

test("preserves embedded and truncated code fences within both message previews", () => {
  const response = "Try this:\n\n```ts\nconst result = …";
  const userMessage = "Explain this markdown:\n\n````markdown\n# Heading\n````";
  const markdown = renderLatestTurnsMarkdown({ response, userMessage });

  assert.ok(
    markdown.includes(
      `\`\`\`\`markdown\n${response}\n\`\`\`\`\n\n---\n\n### Last User reply:`,
    ),
  );
  assert.ok(
    markdown.endsWith(`\`\`\`\`\`markdown\n${userMessage}\n\`\`\`\`\``),
  );
});
