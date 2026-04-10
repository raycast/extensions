import { runEventBridge } from "./ai-event-bridge.mjs";
import { getCodexBashRisk } from "./lib/codex-bash-risk.mjs";

const raw = await readStdin();
const event = raw ? JSON.parse(raw) : {};

const command = event.tool_input?.command;
const risk = getCodexBashRisk(command);

if (!risk) {
  process.exit(0);
}

await runEventBridge({
  source: "codex",
  raw: {
    type: "needs_input",
    hook_event_name: "PreToolUse",
    title: "Codex wants to run a risky Bash command",
    message: summarizeCommand(command, risk),
    returnUrl: process.env.AI_NOTIFIER_RETURN_URL ?? null,
  },
  writeStdout: false,
});

process.stdout.write(
  JSON.stringify({
    systemMessage: `Codex hook flagged a potentially risky Bash command (${risk}). Review the command before approving it.`,
  }),
);

function summarizeCommand(command, risk) {
  const normalized =
    typeof command === "string" ? command.replace(/\s+/g, " ").trim() : "";
  const preview =
    normalized.length > 140
      ? `${normalized.slice(0, 137)}...`
      : normalized || "Codex prepared an empty Bash command.";

  return `${risk}: ${preview}`;
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input.trim();
}
