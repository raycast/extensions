import { runEventBridge } from "./ai-event-bridge.mjs";

export async function main() {
  const rawInput = await readStdin();
  const payload = rawInput ? JSON.parse(rawInput) : {};

  // Copilot exposes session lifecycle hooks, not a first-class needs_input event.
  // Only forward successful session completion into the shared "done" semantic.
  if (payload.reason !== "complete") {
    process.stdout.write(
      JSON.stringify({
        skipped: true,
        reason: payload.reason ?? "unknown",
      }),
    );
    return { skipped: true, reason: payload.reason ?? "unknown" };
  }

  return runEventBridge({
    source: "copilot",
    raw: {
      ...payload,
      type: "done",
      hook_event_name: "sessionEnd",
      title: "GitHub Copilot finished the task",
      message: "GitHub Copilot Done",
    },
  });
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input.trim();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
