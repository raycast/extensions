import { improveSystem, TEXT_SCHEMA } from "./lib/prompts";
import { runQuickTask } from "./lib/quick";

export default async function Command() {
  await runQuickTask<{ text: string }>({
    command: "improve-writing",
    title: "Improve Writing",
    progress: "Improving…",
    system: improveSystem(),
    schema: TEXT_SCHEMA,
    done: () => "✓ Improved",
  });
}
