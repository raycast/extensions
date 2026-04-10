import { runEventBridge } from "./ai-event-bridge.mjs";

const raw = await readStdin();
const event = raw ? JSON.parse(raw) : {};

await runEventBridge({
  source: "codex",
  raw: {
    type: "done",
    hook_event_name: "Stop",
    title: "Codex finished the turn",
    message: summarize(event.last_assistant_message),
    returnUrl: process.env.AI_NOTIFIER_RETURN_URL ?? null,
  },
  writeStdout: false,
});

process.stdout.write(JSON.stringify({ continue: true }));

function summarize(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "Codex finished the current turn.";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 140
    ? `${normalized.slice(0, 137)}...`
    : normalized;
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input.trim();
}
