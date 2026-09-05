import { describe, expect, it } from "vitest";
import { reflowOutcome } from "../src/lib/reflow-outcome";

const sample = `## Co padło

Cześć, test nadal się wykonuje, więc będę sprawdzał status
  aż się skończy i dopiero wtedy odpiszę.

- OpenAI zwraca 400: "Item rs_abc of type reasoning was provided
  without its required following item."
- Trigger: historia odtwarza tury asystenta, które mają tylko
  thinking, często po przerwanych runach.

\`\`\`ts
function hello() {
  return 1
}
\`\`\`

- Test regresji jest w packages/ai/test/openai-responses-
  reasoning-replay.test.ts.
`;

describe("user reflow sample", () => {
  it("joins wrapped prose, bullets, and hyphenated paths and keeps the fence", () => {
    const result = reflowOutcome(sample);
    expect(result.status).toBe("reflowed");
    if (result.status !== "reflowed") return;
    expect(result.text).toContain(
      "Cześć, test nadal się wykonuje, więc będę sprawdzał status aż się skończy i dopiero wtedy odpiszę.",
    );
    expect(result.text).toContain(
      '- OpenAI zwraca 400: "Item rs_abc of type reasoning was provided without its required following item."',
    );
    expect(result.text).toContain(
      "- Trigger: historia odtwarza tury asystenta, które mają tylko thinking, często po przerwanych runach.",
    );
    expect(result.text).toContain("openai-responses-reasoning-replay.test.ts");
    expect(result.text).toContain("```ts\nfunction hello() {\n  return 1\n}\n```");
  });
});
