import { fixSystem, TEXT_SCHEMA } from "./lib/prompts";
import { runQuickTask } from "./lib/quick";

export default async function Command() {
  await runQuickTask<{ text: string }>({
    command: "fix-grammar",
    title: "Fix Spelling and Grammar",
    progress: "Fixing…",
    system: fixSystem(),
    schema: TEXT_SCHEMA,
    skipUnchanged: true,
    done: (_, changed) => (changed ? "✓ Fixed" : "✓ No mistakes found"),
  });
}
