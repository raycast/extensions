import { runGeminiAskUserBridge } from "./lib/gemini-ask-user-bridge.mjs";

const raw = await readStdin();
const event = raw ? JSON.parse(raw) : {};
const result = await runGeminiAskUserBridge({ raw: event });

if (result) {
  process.stdout.write(JSON.stringify(result));
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input.trim();
}
