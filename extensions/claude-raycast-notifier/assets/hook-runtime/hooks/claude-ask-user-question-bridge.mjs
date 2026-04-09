import { runClaudeAskUserQuestionBridge } from "./lib/claude-ask-user-question-bridge.mjs";

export async function main() {
  const rawInput = await readStdin();
  const raw = rawInput ? JSON.parse(rawInput) : {};
  const result = await runClaudeAskUserQuestionBridge({ raw });

  if (result) {
    process.stdout.write(JSON.stringify(result));
  }

  return result;
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input.trim();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
