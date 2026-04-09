import { runEventBridge } from "./ai-event-bridge.mjs";

const raw = await readStdin();
const notification = raw ? JSON.parse(raw) : {};
const details = notification.details ?? {};

await runEventBridge({
  source: "gemini",
  raw: {
    type: "needs_input",
    hook_event_name: "Notification",
    notification_type: notification.notification_type ?? "Notification",
    title: "Gemini needs your attention",
    message:
      notification.message ??
      details.message ??
      "Gemini emitted a notification that may need your attention.",
    returnUrl: process.env.AI_NOTIFIER_RETURN_URL ?? "gemini://",
  },
});

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input.trim();
}
